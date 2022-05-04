const logger = require('consola');
const cmd = require('../../utils/cmd');
var isWin = require('os').platform().indexOf('win32') > -1;

function getBinPath() {
    return `${__dirname}/../../../bin/media-get` + (isWin ? '.exe' : '');
}

async function getMediaGetInfo() {
    let cmdStr = `${getBinPath()} -h`;

    const {code, message} = await cmd(cmdStr);
    if (code != 0) {
        logger.error(`please install media-get first`);
        return false;
    }

    const hasInstallFFmpeg = message.indexOf('FFmpeg,FFprobe: installed') > -1;
    const versionInfo = message.match(/(Version:.+?)\n/);

    return {
        hasInstallFFmpeg,
        versionInfo: versionInfo ? versionInfo[1] : '',
    }
}


module.exports = {
    getBinPath: getBinPath,
    getMediaGetInfo: getMediaGetInfo,
}