const { fetchWithUrl, getMetaWithUrl } = require('../media_fetcher');
const logger = require('consola');
const sleep = require('../../utils/sleep');
const findTheBestMatchFromWyCloud = require('../search_songs/find_the_best_match_from_wycloud');
const JobManager = require('../job_manager');
const JobStatus = require('../../consts/job_status');
const JobType = require('../../consts/job_type');
const configManager = require('../config_manager');
const fs = require('fs');
const libPath = require('path');
const utilFs = require('../../utils/fs');
const { downloadFromLocalTmpPath } = require('./download_to_local');
const uploadWithRetryThenMatch = require('./upload_to_wycloud_disk_with_retry_then_match');

module.exports = async function syncSingleSongWithUrl(uid, url, {
    songName = "",
    artist = "",
    album = "",
    songFromWyCloud = null
} = {}, jobId = 0, jobType = JobType.SyncSongFromUrl, playlistName = "", collectRet) {
    // step 1. fetch song info
    const songInfo = await getMetaWithUrl(url);
    logger.info(songInfo);
    if (songInfo === false || songInfo.isTrial) {
        logger.error(`fetch song info failed or it's a trial song. ${JSON.stringify(songInfo)}`);
        return false;
    }

    await updateJobIfNeed(uid, jobId, songInfo, jobType);

    // step 2. find the best match from wycloud
    if (songFromWyCloud === null) {
        let findSongName, findArtist, findAlbum;
        if (songName !== "" && artist !== "") {
            logger.info(`use the user input song name and artist, ${songName}, ${artist}, ${album}`);
            findSongName = songName;
            findArtist = artist;
            findAlbum = album;
        } else if (songInfo.fromMusicPlatform) {
            findSongName = songInfo.songName;
            findArtist = songInfo.artist;
            findAlbum = songInfo.album;
        } 
        songFromWyCloud = await findTheBestMatchFromWyCloud(uid, {
            songName: findSongName,
            artist: findArtist,
            album: findAlbum,
        });
    } else {
        logger.info(`use the songFromWyCloud by params`);
    }

    logger.info('songFromWyCloud:', songFromWyCloud);
    
    // step 3. download
    // should add meta tag if not matched song on wycloud
    const path = await fetchWithUrl(url, {songName: songInfo.songName, addMediaTag: songFromWyCloud ? false : true});
    if (path === false) {
        return false;
    }

    // step 4. upload or download
    logger.info(`handle song start: ${path}`);

    if (jobType === JobType.DownloadSongFromUrl || jobType === JobType.SyncThePlaylistToLocalService) {
        return await downloadFromLocalTmpPath(path, songInfo, playlistName, collectRet);
    } else {
        return await uploadWithRetryThenMatch(uid, path, songInfo, songFromWyCloud);
    }
}

async function updateJobIfNeed(uid, jobId, songInfo, jobType) {
    if (!jobId) {
        return;
    }
    const operation = jobType === JobType.SyncSongFromUrl ? "上传" : "下载";
    await JobManager.updateJob(uid, jobId, {
        name: `${operation}歌曲：${songInfo.songName}`,
        status: JobStatus.InProgress,
        desc: `歌曲: ${songInfo.songName}`,
        tip: "任务开始",
    });
}