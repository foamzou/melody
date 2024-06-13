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
    const {code, message} = await cmd(getBinPath(isTempBin), ['-h']);
    if (code != 0) {
        logger.error(`please install media-get first`);
        return false;
    }

    const hasInstallFFmpeg = message.indexOf('FFmpeg,FFprobe: installed') > -1;
    const versionInfo = message.match(/Version:(.+?)\n/);

    return {
        hasInstallFFmpeg,
        versionInfo: versionInfo ? versionInfo[1].trim() : '',
        fullMessage: message,
    }
}

async function getLatestMediaGetVersion() {
    const remoteConfig = await RemoteConfig.getRemoteConfig();
    // TODO: 这里应当使用多个备用代理地址，每次将成功的保存到本地缓存，下次优先使用
    const latestVerisonUrl = `${remoteConfig.githubProxy}/https://raw.githubusercontent.com/foamzou/media-get/main/LATEST_VERSION`;
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
        const fileStream = fs.createWriteStream(filename);
        https.get(url, res => {
            res.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close(() => resolve(true)); // Successfully downloaded and saved, resolve with true
            });
        })
        .on('error', (error) => {
            console.error('Download error:', error);
            fileStream.destroy();
            fs.unlink(filename, () => resolve(false)); // On error, delete the file and resolve with false
        });
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
    return `${remoteConfig.githubProxy}/https://github.com/foamzou/media-get/releases/download/v${latestVersion}/media-get-${latestVersion}-${suffix}`;
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
    
    const temBinInfo = await getMediaGetInfo(true)
    if (!temBinInfo
         || temBinInfo.versionInfo === ""
        ) {
        logger.error('testing new bin failed. Don`t update', temBinInfo)
        return false;
    }

    const renameRet = await renameFile(getBinPath(true), getBinPath());
    if (!renameRet) {
        logger.error('rename failed');
        return false;
    }
    return true;
}

module.exports = {
    getBinPath: getBinPath,
    getMediaGetInfo: getMediaGetInfo,
    getLatestMediaGetVersion: getLatestMediaGetVersion,
    downloadTheLatestMediaGet: downloadTheLatestMediaGet,
}