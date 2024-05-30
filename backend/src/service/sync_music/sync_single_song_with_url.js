const { fetchWithUrl, getMetaWithUrl } = require('../media_fetcher');
const { uploadSong, searchSong, matchAndFixCloudSong } = require('../music_platform/wycloud');
const logger = require('consola');
const sleep = require('../../utils/sleep');
const findTheBestMatchFromWyCloud = require('../search_songs/find_the_best_match_from_wycloud');
const JobManager = require('../job_manager');
const JobStatus = require('../../consts/job_status');
const JobType = require('../../consts/job_type');
const configManager = require('../config_manager');
const fs = require('fs');
const utilFs = require('../../utils/fs');

module.exports = async function syncSingleSongWithUrl(uid, url, {
    songName = "",
    artist = "",
    album = "",
    songFromWyCloud = null
} = {}, jobId = 0, jobType = JobType.SyncSongFromUrl) {
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
    let isHandleSucceed = false;
    let uploadResult;


    if (jobType === JobType.DownloadSongFromUrl) {
        const downloadPath = (await configManager.getGlobalConfig()).downloadPath;
        if (!downloadPath) {
            logger.error(`download path not set`);
            return "IOFailed";
        }
        const destPath = `${downloadPath}/${songInfo.album ? songInfo.album+'-' : ''}${songInfo.artist ? songInfo.artist+'-' : ''}${songInfo.songName}.mp3`;
        try {
            await utilFs.asyncMoveFile(path, destPath);
        } catch (err) {
            logger.error(`move file failed, ${path} -> ${destPath}`, err);
            return "IOFailed";
        }
        logger.info(`download song success, path: ${destPath}`);
        return true;
    } else {
        const startTime = new Date();
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

        // step 5. fix match manually IF not matched in music platform
        if (!songFromWyCloud) {
            logger.info(`would not try to match from wycloud!!! uid: ${uid}, ${JSON.stringify(songInfo)}`);
            return true;
        }
        const matchResult = await matchAndFixCloudSong(uid, uploadResult.songId, songFromWyCloud.songId);
        logger.info(`match song ${matchResult ? 'success' : 'failed'}, uid: ${uid}, songId: ${uploadResult.songId}, wySongId: ${songFromWyCloud.songId}`);
    } 
    return true;
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

