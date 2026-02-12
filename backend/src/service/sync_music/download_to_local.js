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
// 辅助函数：清理文件名
function cleanFilename(filename) {
    // 移除路径分隔符
    filename = filename.replace(/[/\\]/g, '');
    
    // 移除Windows保留字符和控制字符
    filename = filename.replace(/[<>:"|?*\x00-\x1f]/g, '');
    
    // 移除开头和结尾的空白和点
    filename = filename.trim().replace(/^\.+|\.+$/g, '');
    
    return filename;
}

function buildDestFilename(globalConfig, songInfo, playlistName) {
    const downloadPath = globalConfig.downloadPath;
    
    // 修复1：明确的格式选择逻辑
    let format;
    if (playlistName && globalConfig.playlistSyncToLocal?.filenameFormat) {
        // 情况1：有播放列表名且配置了播放列表格式
        format = globalConfig.playlistSyncToLocal.filenameFormat;
    } else {
        // 情况2：默认格式
        format = globalConfig.filenameFormat || '{artist} - {songName}';
}  
    // "Unknown"兜底，如果是无效值，替换
    const artistSafe = cleanFilename(songInfo.artist || '') || 'Unknown';
    const songNameSafe = cleanFilename(songInfo.songName || '') || 'Unknown';
    const playlistSafe = cleanFilename(playlistName|| '') || 'UnknownPlaylist';
    const albumSafe = cleanFilename(songInfo.album|| '') || 'Unknown';

    // 替换变量 + 使用已经清洗的数据替换，防止由于替换内容包含目录分割符而导致目录错误
    let filename = format
        .replace(/{artist}/g, artistSafe)
        .replace(/{songName}/g, songNameSafe)
        .replace(/{playlistName}/g, playlistSafe)
        .replace(/{album}/g, albumSafe);

    // 以 .mp3 结尾 !!!这会导致无法实现“表面上”的无损下载，此处应当进行判断!!!

    if (!filename.toLowerCase().endsWith('.mp3')) {
        filename += '.mp3';
    }
    const validExtensions = /\.(mp3|flac|wav|m4a|ogg|ape|aac|wma)$/i;

    if (!validExtensions.test(filename)) {
        filename += '.mp3';
    }
    // 使用 libPath.join 安全拼接路径
    return libPath.join(downloadPath, filename);
}

