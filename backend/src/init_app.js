const logger = require('consola');
const fs = require('fs');
const process = require('process');
const mediaGet = require('./service/media_fetcher/media_get');

function initDir() {
    // make sure all dir has been created
    const dirList = [
        __dirname + '/../.profile',
        __dirname + '/../.profile/cookie',
        __dirname + '/../.profile/data',
        __dirname + '/../.profile/data/jobs',
    ];

    dirList.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    });
}

function initAccountFileIfNotExisted() {
    const targetFile = __dirname + '/../.profile/accounts.json';
    const sampleFile = __dirname + '/../accounts.sample.json';
    if (!fs.existsSync(targetFile)) {
        fs.copyFileSync(sampleFile, targetFile);
        logger.info('初始化 accounts.json 文件成功, 默认的 melody key 为： melody');
    }
}

module.exports = async function() {
    initDir();

    initAccountFileIfNotExisted();

    // check if media-get is installed
    const mediaGetInfo = await mediaGet.getMediaGetInfo();
    if (mediaGetInfo === false) {
        process.exit(-1);
    }
    if (!mediaGetInfo.hasInstallFFmpeg) {
        logger.error('please install FFmpeg and FFprobe first');
        process.exit(-1);
    }
    logger.info(`[media-get] Version: ${mediaGetInfo.versionInfo}`);

    // TODO check media-get latest version
}