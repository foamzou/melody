const { getSongInfo } = require('../music_platform/wycloud');
const syncSingleSongWithUrl = require('./sync_single_song_with_url');
const logger = require('consola');
const { findTheBestMatchFromWyCloud, searchSongsWithSongMeta } = require('../search_songs');
const JobManager = require('../job_manager');
const JobType = require('../../consts/job_type');
const JobStatus = require('../../consts/job_status');
const BusinessCode = require('../../consts/business_code');

module.exports = async function unblockMusiWithSongId(uid, source, songId) {
    const songInfo = await getSongInfo(uid, songId);
    if (songInfo === false) {
        return false;
    }

    // create job
    const args = `unblockMusicWithSongId: {"source":${source},"songId":${songId}}`;
    if (await JobManager.findActiveJobByArgs(uid, args)) {
        logger.info(`unblock music with songID job is already running.`);
        return BusinessCode.StatusJobAlreadyExisted;
    }
    const jobId = await JobManager.createJob(uid, {
        name: `解锁歌曲：${songInfo.songName}`,
        args,
        type: JobType.UnblockedSong,
        status: JobStatus.Pending,
        desc: `${songInfo.songName} - ${songInfo.artists.join(',')}`,
        progress: 0,
        tip: "等待解锁",
        createdAt: Date.now()
    });
        
    // async do the job
    (async () => {
        logger.info(`${jobId}: try to unblock song: ${JSON.stringify(songInfo)}`);
        // download the songs and upload to cloud
        const syncSucceed = await syncSingleSongWithMeta(uid, songInfo);

        let tip = songInfo.songName + (syncSucceed ?  ": 解锁成功" : ": 解锁失败");
        await JobManager.updateJob(uid, jobId, {
            progress: 1,
            status: syncSucceed ? JobStatus.Finished : JobStatus.Failed,
            tip,
            data: {}
        });
    })().catch(async e => {
        logger.error(`${jobId}: ${e}`);
        let tip = '遇到不可思议的错误了哦，任务终止';
        await JobManager.updateJob(uid, jobId, {
            status: JobStatus.Failed,
            tip,
        });
    })

    return jobId;
}

async function syncSingleSongWithMeta(uid, wySongMeta) {
    logger.info(`sync single song with meta: ${JSON.stringify(wySongMeta)}`);
    const songFromWyCloud = await findTheBestMatchFromWyCloud(uid, {
        songName: wySongMeta.songName,
        artist: wySongMeta.artists[0],
        album: wySongMeta.album,
        musicPlatformSongId: wySongMeta.songId,
    });
    // search songs with the meta
    const searchListfilttered = await searchSongsWithSongMeta({
        songName: wySongMeta.songName,
        artist: wySongMeta.artists[0],
        album: wySongMeta.album,
        duration: wySongMeta.duration,
    }, {
        expectArtistAkas: songFromWyCloud.artists ? songFromWyCloud.artists : [],
        allowSongsJustMatchDuration: false,
        allowSongsNotMatchMeta: false,
    });

    logger.info(`use the searchListfilttered: ${JSON.stringify(searchListfilttered)}`);
    if (searchListfilttered === false) {
        return false;
    }

    // find the best match song
    for (const searchItem of searchListfilttered) {
        logger.info(`try to the search item: ${JSON.stringify(searchItem)}`);

        const isUploadSucceed = await syncSingleSongWithUrl(uid, searchItem.url, {
            songName: wySongMeta.songName,
            artist: wySongMeta.artists[0],
            album: wySongMeta.album,
            songFromWyCloud,
        });
        if (isUploadSucceed === "IOFailed") {
            logger.error(`not try others due to upload failed.`);
            return false;
        }
        if (isUploadSucceed) {
            return true;
        }
    }
    return false;
}
