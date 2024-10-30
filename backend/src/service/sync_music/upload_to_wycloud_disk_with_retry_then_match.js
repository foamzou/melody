const { uploadSong, matchAndFixCloudSong } = require('../music_platform/wycloud');
const logger = require('consola');
const fs = require('fs');
const sleep = require('../../utils/sleep');

module.exports = async function uploadWithRetryThenMatch(uid, path, songInfo, songFromWyCloud) {
    const startTime = new Date();
    let isHandleSucceed = false;
    let uploadResult;

    for (let tryCount = 0; tryCount < 5; tryCount++) {
        if (tryCount !== 0) {
            logger.info(`upload song failed, try again: ${path}`);
        }
        uploadResult = await uploadSong(uid, path);
        if (uploadResult === false) {
            logger.error(`upload song failed, uid: ${uid}, path: ${path}`);
            await sleep(3000);
            continue;
        } else {
            isHandleSucceed = true;
            break;
        }
    }

    // del file async
    fs.unlink(path, () => {});

    if (!isHandleSucceed) {
        logger.error(`upload song failed, uid: ${uid}, path: ${path}`);
        return "IOFailed";
    }

    const costSeconds = (new Date() - startTime) / 1000;
    logger.info(`upload song success, uid: ${uid}, path: ${path}, cost: ${costSeconds}s`);

    if (uploadResult.matched) {
        logger.info(`matched song already, uid: ${uid}, songId: ${uploadResult.songId}. ignore.`);
        return true;
    }

    // fix match manually IF not matched in music platform
    if (!songFromWyCloud) {
        logger.info(`would not try to match from wycloud!!! uid: ${uid}, ${JSON.stringify(songInfo)}`);
        return true;
    }
    const matchResult = await matchAndFixCloudSong(uid, uploadResult.songId, songFromWyCloud.songId);
    logger.info(`match song ${matchResult ? 'success' : 'failed'}, uid: ${uid}, songId: ${uploadResult.songId}, wySongId: ${songFromWyCloud.songId}`);
    return true;
}