const { getBlockedSongsFromPlaylist } = require('../music_platform/wycloud');
const syncSingleSongWithUrl = require('./sync_single_song_with_url');
const logger = require('consola');
const { findTheBestMatchFromWyCloud, searchSongsWithSongMeta } = require('../search_songs');
const JobManager = require('../job_manager');
const JobType = require('../../consts/job_type');
const JobStatus = require('../../consts/job_status');
const BusinessCode = require('../../consts/business_code');

module.exports = async function unblockMusicInPlaylist(uid, source, playlistId) {
    // step 1. get blocked songs
    const songsInfo = await getBlockedSongsFromPlaylist(uid, source, playlistId);
    if (songsInfo === false) {
        return false;
    }

    if (songsInfo.blockedSongs.length === 0) {
        return false;
    }

    // create job
    const args = `unblockMusicInPlaylist: {"source":${source},"playlistId":${playlistId}}`;
    if (await JobManager.findActiveJobByArgs(uid, args)) {
        logger.info(`unblock music in playlist job is already running.`);
        return BusinessCode.StatusJobAlreadyExisted;
    }
    const jobId = await JobManager.createJob(uid, {
        name: `解锁歌单：${songsInfo.name}`,
        args,
        type: JobType.UnblockedPlaylist,
        status: JobStatus.Pending,
        desc: `有${songsInfo.blockedSongs.length}首歌曲需要解锁`,
        progress: 0,
        tip: "等待解锁",
        createdAt: Date.now()
    });
        
    // async do the job
    (async () => {
        const songs = songsInfo.blockedSongs;
        logger.info(`${jobId}: try to unblock songs: ${JSON.stringify(songs)}`);
        await JobManager.updateJob(uid, jobId, {
            status: JobStatus.InProgress,
        });
        const succeedList = [];
        const failedList = [];
        // step 2. download the songs and upload to cloud
        for (const song of songs) {
            let tip = `[${(succeedList.length + failedList.length + 1)}/${songs.length}] 正在解锁歌曲：${song.songName}`;
            await JobManager.updateJob(uid, jobId, {
                tip,
            });
            const syncSucceed = await syncSingleSongWithMeta(uid, song);
            if (syncSucceed) {
                await JobManager.updateJob(uid, jobId, {
                    log: song.songName + ": 解锁成功",
                });
                succeedList.push({songName: song.songName, artist: song.artists[0]});
            } else {
                await JobManager.updateJob(uid, jobId, {
                    log: song.songName + ": 解锁失败",
                });
                failedList.push({songName: song.songName, artist: song.artists[0]});
            }
            await JobManager.updateJob(uid, jobId, {
                progress: (succeedList.length + failedList.length) / songs.length,
            });
        }
    
        let tip = `任务完成，成功${succeedList.length}首，失败${failedList.length}首`;
        await JobManager.updateJob(uid, jobId, {
            progress: 1,
            status: succeedList.length > 0 ? JobStatus.Finished : JobStatus.Failed,
            tip,
            data: {
                succeedList,
                failedList,
            }
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
