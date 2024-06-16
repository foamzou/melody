const { fetchWithUrl, getMetaWithUrl } = require('../media_fetcher');
const { uploadSong, searchSong, matchAndFixCloudSong } = require('../music_platform/wycloud');
const logger = require('consola');
const sleep = require('../../utils/sleep');
const configManager = require('../config_manager');
const fs = require('fs');
const libPath = require('path');
const utilFs = require('../../utils/fs');


module.exports = {
    downloadFromLocalTmpPath: downloadFromLocalTmpPath,
    buildDestFilename: buildDestFilename,
}

async function downloadFromLocalTmpPath(tmpPath, songInfo = {
    songName: "",
    artist: "",
    album: "",
}, playlistName = '', collectResponse) {
    const globalConfig = (await configManager.getGlobalConfig());
    const downloadPath = globalConfig.downloadPath;
    if (!downloadPath) {
        logger.error(`download path not set`);
        return "IOFailed";
    }
    const destPathAndFilename = buildDestFilename(globalConfig, songInfo, playlistName);
    const destPath = libPath.dirname(destPathAndFilename);
    // make sure the path is exist
    await utilFs.asyncMkdir(destPath, {recursive: true});
    try {
        if (await utilFs.asyncFileExisted(destPathAndFilename)) {
            logger.info(`file already exists, remove it: ${destPathAndFilename}`);
            await utilFs.asyncUnlinkFile(destPathAndFilename)
        }
        await utilFs.asyncMoveFile(tmpPath, destPathAndFilename);
    } catch (err) {
        logger.error(`move file failed, ${tmpPath} -> ${destPathAndFilename}`, err);
        return "IOFailed";
    }
    if (collectResponse !== undefined) {
        try {
            const md5Value = await utilFs.asyncMd5(destPathAndFilename);
            collectResponse['md5Value'] = md5Value;
        } catch (err) {
            logger.error(`md5 failed, ${destPathAndFilename}`, err);
            // don't return false, just log it
        }
    }
    logger.info(`download song success, path: ${destPathAndFilename}`);
    return true;
}

function buildDestFilename(globalConfig, songInfo, playlistName) {
    const downloadPath = globalConfig.downloadPath;
    let filename = (playlistName ? globalConfig.playlistSyncToLocal?.filenameFormat : globalConfig.filenameFormat)
        .replace('{artist}', songInfo.artist ? songInfo.artist : 'Unknown')
        .replace('{songName}', songInfo.songName ? songInfo.songName : 'Unknown')
        .replace('{playlistName}', playlistName ? playlistName : 'UnknownPlayList')
        .replace('{album}', songInfo.album ? songInfo.album : 'Unknown');
    // remove the head / and \ in filename
    filename = filename.replace(/^[\/\\]+/, '') + '.mp3';
    return `${downloadPath}${libPath.sep}${filename}`
}