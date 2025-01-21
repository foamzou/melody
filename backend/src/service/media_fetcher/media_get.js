const logger = require('consola');
const https = require('https');
const cmd = require('../../utils/cmd');
var isWin = require('os').platform().indexOf('win32') > -1;
const isLinux = require('os').platform().indexOf('linux') > -1;
const isDarwin = require('os').platform().indexOf('darwin') > -1;
const httpsGet = require('../../utils/network').asyncHttpsGet;
const RemoteConfig = require('../remote_config');
const fs = require('fs');

function getBinPath(isTemp = false) {
    return `${__dirname}/../../../bin/media-get` + (isTemp ? '-tmp-' : '') + (isWin ? '.exe' : '');
}

async function getMediaGetInfo(isTempBin = false) {
    try {
        const {code, message, error} = await cmd(getBinPath(isTempBin), ['-h']);
        logger.info('Command execution result:', {
            code,
            error,
            binPath: getBinPath(isTempBin)
        });
        
        if (code != 0) {
            logger.error(`Failed to execute media-get:`, {
                code,
                error,
                message
            });
            return false;
        }

        const hasInstallFFmpeg = message.indexOf('FFmpeg,FFprobe: installed') > -1;
        const versionInfo = message.match(/Version:(.+?)\n/);

        return {
            hasInstallFFmpeg,
            versionInfo: versionInfo ? versionInfo[1].trim() : '',
            fullMessage: message,
        }
    } catch (err) {
        logger.error('Exception while executing media-get:', err);
        return false;
    }
}

async function getLatestMediaGetVersion() {
    const remoteConfig = await RemoteConfig.getRemoteConfig();
    const latestVerisonUrl = `${remoteConfig.bestGithubProxy}https://raw.githubusercontent.com/foamzou/media-get/main/LATEST_VERSION`;
    console.log('start to get latest version from: ' + latestVerisonUrl);

    const latestVersion = await httpsGet(latestVerisonUrl);
    console.log('latest version: ' + latestVersion);
    if (latestVersion === null || (latestVersion || "").split('.').length !== 3) {
        logger.error('获取 media-get 最新版本号失败, got: ' + latestVersion);
        return false;
    }
    return latestVersion;
}

async function downloadFile(url, filename) {
    return new Promise((resolve) => {
        let fileStream = fs.createWriteStream(filename);
        let receivedBytes = 0;

        const handleResponse = (res) => {
            // Handle redirects
            if (res.statusCode === 301 || res.statusCode === 302) {
                logger.info('Following redirect');
                fileStream.end();
                fileStream = fs.createWriteStream(filename);
                if (res.headers.location) {
                    https.get(res.headers.location, handleResponse)
                        .on('error', handleError);
                }
                return;
            }

            // Check for successful status code
            if (res.statusCode !== 200) {
                handleError(new Error(`HTTP Error: ${res.statusCode}`));
                return;
            }

            const totalBytes = parseInt(res.headers['content-length'], 10);

            res.on('error', handleError);
            fileStream.on('error', handleError);

            res.pipe(fileStream);

            res.on('data', (chunk) => {
                receivedBytes += chunk.length;
            });

            fileStream.on('finish', () => {
                fileStream.close(() => {
                    if (receivedBytes === 0) {
                        fs.unlink(filename, () => {
                            logger.error('Download failed: Empty file received');
                            resolve(false);
                        });
                    } else if (totalBytes && receivedBytes < totalBytes) {
                        fs.unlink(filename, () => {
                            logger.error(`Download incomplete: ${receivedBytes}/${totalBytes} bytes`);
                            resolve(false);
                        });
                    } else {
                        resolve(true);
                    }
                });
            });
        };

        const handleError = (error) => {
            fileStream.destroy();
            fs.unlink(filename, () => {
                logger.error('Download error:', error);
                resolve(false);
            });
        };

        const req = https.get(url, handleResponse)
            .on('error', handleError)
            .setTimeout(60000, () => {
                handleError(new Error('Download timeout'));
            });

        req.on('error', handleError);
    });
}

async function getMediaGetRemoteFilename(latestVersion) {
    let suffix = 'win.exe';
    if (isLinux) {
        suffix = 'linux';
    }
    if (isDarwin) {
        suffix = 'darwin';
    }
    if (process.arch === 'arm64') {
        suffix += '-arm64';
    }
    const remoteConfig = await RemoteConfig.getRemoteConfig();
    return `${remoteConfig.bestGithubProxy}https://github.com/foamzou/media-get/releases/download/v${latestVersion}/media-get-${latestVersion}-${suffix}`;
}

const renameFile = (oldName, newName) => {
    return new Promise((resolve, reject) => {
      fs.rename(oldName, newName, (err) => {
        if (err) {
            logger.error(err)
            resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  };

async function downloadTheLatestMediaGet(version) {
    const remoteFile = await getMediaGetRemoteFilename(version);
    logger.info('start to download media-get: ' + remoteFile);
    const ret = await downloadFile(remoteFile, getBinPath(true));
    if (ret === false) {
        logger.error('download failed');
        return false;
    }
    fs.chmodSync(getBinPath(true), '755');
    logger.info('download finished');
    
    // Add debug logs for binary file and validate
    try {
        const stats = fs.statSync(getBinPath(true));
        logger.info(`Binary file stats: size=${stats.size}, mode=${stats.mode.toString(8)}`);
        
        // Check minimum file size (should be at least 2MB)
        const minSize = 2 * 1024 * 1024;  // 2MB
        if (stats.size < minSize) {
            logger.error(`Invalid binary file size: ${stats.size} bytes. Expected at least ${minSize} bytes`);
            return false;
        }
        
        // Check file permissions (should be executable)
        const executableMode = 0o755;
        if ((stats.mode & 0o777) !== executableMode) {
            logger.error(`Invalid binary file permissions: ${stats.mode.toString(8)}. Expected: ${executableMode.toString(8)}`);
            return false;
        }

        // Skip validation when cross compiling
        if (!process.env.CROSS_COMPILING) {
            const temBinInfo = await getMediaGetInfo(true);
            logger.info('Execution result:', {
                binPath: getBinPath(true),
                arch: process.arch,
                platform: process.platform,
                temBinInfo
            });
            
            if (!temBinInfo || temBinInfo.versionInfo === "") {
                logger.error('testing new bin failed. Details:', {
                    binExists: fs.existsSync(getBinPath(true)),
                    binPath: getBinPath(true),
                    error: temBinInfo === false ? 'Execution failed' : 'No version info'
                });
                return false;
            }
        }
        
        const renameRet = await renameFile(getBinPath(true), getBinPath());
        if (!renameRet) {
            logger.error('rename failed');
            return false;
        }
        return true;
    } catch (err) {
        logger.error('Failed to get binary stats:', err);
        return false;
    }
}

module.exports = {
    getBinPath: getBinPath,
    getMediaGetInfo: getMediaGetInfo,
    getLatestMediaGetVersion: getLatestMediaGetVersion,
    downloadTheLatestMediaGet: downloadTheLatestMediaGet,
}