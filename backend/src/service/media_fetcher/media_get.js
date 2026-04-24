const logger = require('consola');
const https = require('https');
const cmd = require('../../utils/cmd');
var isWin = require('os').platform().indexOf('win32') > -1;
const isLinux = require('os').platform().indexOf('linux') > -1;
const isDarwin = require('os').platform().indexOf('darwin') > -1;
const httpsGet = require('../../utils/network').asyncHttpsGet;
const RemoteConfig = require('../remote_config');
const fs = require('fs');
const { pipeline } = require('stream/promises');
const path = require('path');

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

async function downloadFile(url, filename, maxRedirects = 20) {
  return new Promise((resolve) => {
    // 自动创建目录，防止报错
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let fileStream;
    let receivedBytes = 0;
    let totalBytes = 0;
    let redirectCount = 0;
    let isFinished = false;

    // 全局下载超时 10 分钟
    const timeout = setTimeout(() => {
      handleError(new Error('Download timeout (10min)'));
    }, 10 * 60 * 1000);

    // 安全清理
    const safeCleanup = () => {
      clearTimeout(timeout);
      if (fileStream && !fileStream.destroyed) {
        fileStream.destroy();
      }
    };

    const handleError = (error) => {
      if (isFinished) return;
      isFinished = true;
      safeCleanup();

      // 只有文件存在时才删除
      fs.access(filename, (err) => {
        if (!err) {
          fs.unlink(filename, (unlinkErr) => {
            if (unlinkErr) {
              logger.debug('Cleanup temp file failed');
            }
          });
        }
      });

      logger.error('Download error:', error.message);
      resolve(false);
    };

    // 处理响应
    const handleResponse = async (res) => {
      try {
        // 重定向
        if ([301, 302, 307, 308].includes(res.statusCode)) {
          redirectCount++;
          if (redirectCount > maxRedirects) {
            throw new Error(`Too many redirects (max ${maxRedirects})`);
          }
          const location = res.headers.location;
          if (!location) throw new Error('Redirect missing location');

          logger.info(`重定向 ${redirectCount}/${maxRedirects}`);
          https.get(location, handleResponse).on('error', handleError);
          return;
        }

        // HTTP 状态错误
        if (res.statusCode !== 200) {
          throw new Error(`HTTP ${res.statusCode}`);
        }

        // 创建写入流
        fileStream = fs.createWriteStream(filename);
        totalBytes = parseInt(res.headers['content-length'], 10) || 0;

        // 统计下载大小
        res.on('data', (chunk) => {
          receivedBytes += chunk.length;
        });

        // 安全流式写入
        await pipeline(res, fileStream);

        // 完成
        safeCleanup();
        if (isFinished) return;
        isFinished = true;

        // 校验文件
        if (receivedBytes === 0) {
          logger.error('Download failed: Empty file');
          fs.unlink(filename, () => resolve(false));
        } else if (totalBytes && receivedBytes < totalBytes) {
          logger.error(`Download incomplete: ${receivedBytes}/${totalBytes}`);
          fs.unlink(filename, () => resolve(false));
        } else {
          logger.info('Download success');
          resolve(true);
        }

      } catch (err) {
        handleError(err);
      }
    };

    // 开始请求
    const req = https.get(url, handleResponse).on('error', handleError);
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
    // Windows 不需要设置权限
    if (!isWin) {
      fs.chmodSync(getBinPath(true), '755');
    }
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
        // Windows 跳过权限检查
        if (!isWin && (stats.mode & 0o777) !== executableMode) {
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
    downloadFile: downloadFile,
    getBinPath: getBinPath,
    getMediaGetInfo: getMediaGetInfo,
    getLatestMediaGetVersion: getLatestMediaGetVersion,
    downloadTheLatestMediaGet: downloadTheLatestMediaGet,
}
