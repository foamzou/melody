const { getSongsFromPlaylist, getPlayUrl } = require('../music_platform/wycloud');
const syncSingleSongWithUrl = require('./sync_single_song_with_url');
const logger = require('consola');
const { findTheBestMatchFromWyCloud, searchSongsWithSongMeta } = require('../search_songs');
const JobManager = require('../job_manager');
const JobType = require('../../consts/job_type');
const JobStatus = require('../../consts/job_status');
const SoundQuality = require('../../consts/sound_quality');
const BusinessCode = require('../../consts/business_code');
const AccountService = require('../account');
const { downloadViaSourceUrl } = require("../media_fetcher/index");
const uploadWithRetryThenMatch = require('./upload_to_wycloud_disk_with_retry_then_match');
const asyncFS = require('../../utils/fs');

// scope:
// 1. for not wy song: download from network then upload to cloud disk
// 2. for wy song: download from wy then upload to cloud disk. (i.e. backup wy song to cloud disk)
module.exports = async function unblockMusicInPlaylist(uid, source, playlistId, options = {
    syncWySong: false,
    syncNotWySong: false,
}) {
    // step 1. get songs
    const songsInfo = await getSongsFromPlaylist(uid, source, playlistId);
    if (songsInfo === false) {
        return false;
    }

    if (songsInfo.songs.length === 0) {
        return false;
    }

    const songsNeedToSync = [];
    songsInfo.songs.forEach(song => {
        if (song.isCloud) {
            return
        }
        // block song
        if (song.isBlocked) {
            if (options.syncNotWySong) {
                songsNeedToSync.push(song);
            }
        } else {
            // wy song
            if (options.syncWySong) {
                songsNeedToSync.push(song);
            }
        }
    });

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
        desc: `有${songsNeedToSync.length}首歌曲需要解锁`,
        progress: 0,
        tip: "等待解锁",
        createdAt: Date.now()
    });
        
    // async do the job
    (async () => {
        const songs = songsNeedToSync;
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
    // 获取 wycloud 的歌曲信息，有 id 就直接 get，没有就 search meta 选一个最匹配的
    const songFromWyCloud = await findTheBestMatchFromWyCloud(uid, {
        songName: wySongMeta.songName,
        artist: wySongMeta.artists[0],
        album: wySongMeta.album,
        musicPlatformSongId: wySongMeta.songId,
    });

    // Case 1: download the song from wy
    if (!wySongMeta.isBlocked) {
        const account = AccountService.getAccount(uid);
        const playUrl = await getPlayUrl(uid, wySongMeta.songId, account.config.playlistSyncToWyCloudDisk.soundQualityPreference === SoundQuality.Lossless);
        // if the playUrl is empty, we think the song is block as well. go through the search process
        if (playUrl) {
            const tmpPath = await downloadViaSourceUrl(playUrl);
            // if download failed, we think due to network issue, just return false. It will retry in the next time
            if (tmpPath === false) {
                return false;
            }

            // add some magic
            try {
                await asyncFS.asyncAppendFile(tmpPath, '00000');
            } catch (e) {
                logger.error(`append file failed: ${tmpPath}`);
                // 追加失败，可以继续
            }

            const isSucceed = await uploadWithRetryThenMatch(uid, tmpPath, null, songFromWyCloud);

            if (isSucceed === true) {
                return true;
            }
            return false;
        }
    }

    // Case 2: search songs with the meta in the internet then upload to cloud
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
