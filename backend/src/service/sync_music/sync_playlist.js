const {
  getSongsFromPlaylist,
  getPlayUrl,
  getPlayUrlWithType,
} = require("../music_platform/wycloud");
const syncSingleSongWithUrl = require("./sync_single_song_with_url");
const logger = require("consola");
const {
  findTheBestMatchFromWyCloud,
  searchSongsWithSongMeta,
} = require("../search_songs");
const JobManager = require("../job_manager");
const JobType = require("../../consts/job_type");
const JobStatus = require("../../consts/job_status");
const BusinessCode = require("../../consts/business_code");
const { downloadViaSourceUrl } = require("../media_fetcher/index");
const {
  downloadFromLocalTmpPath,
  buildDestFilename,
} = require("./download_to_local");
const KV = require("../kv");
const utilFs = require("../../utils/fs");
const configManager = require("../config_manager");
const path = require("path");
const { consts } = require("../../consts/source");
const soundQualityConst = require("../../consts/sound_quality");

module.exports = async function syncPlaylist(uid, source, playlistId) {
  // step 1. get all the songs
  const playlistInfo = await getSongsFromPlaylist(uid, source, playlistId);
  if (playlistInfo === false) {
    return false;
  }

  // calc the songs need to be synced
  const songsNeedToSync = [];
  const cacheForCalcSongsNeedToSync = {};

  // 如果开启了删除功能,先执行删除
  const globalConfig = await configManager.getGlobalConfig();
  if (globalConfig.playlistSyncToLocal.deleteLocalFile) {
    const currentSongIDs = playlistInfo.songs.map(song => song.songId);
    await syncDeleteFiles(playlistId, currentSongIDs);
  }

  for (const song of playlistInfo.songs) {
    const needToSync = await isNeedToSyncFile(playlistId, song.songId, cacheForCalcSongsNeedToSync);
    if (!needToSync) {
      continue;
    }
    songsNeedToSync.push(song);
  }

  if (songsNeedToSync.length === 0) {
    logger.info(`[No need] all the songs in the playlist are already downloaded.`);
    return BusinessCode.StatusJobNoNeedToCreate;
  }

  // create job
  const args = `syncPlaylist: {"source":${source},"playlistId":${playlistId}}`;
  if (await JobManager.findActiveJobByArgs(uid, args)) {
    logger.info(`syncPlaylist job is already running.`);
    return BusinessCode.StatusJobAlreadyExisted;
  }
  const jobId = await JobManager.createJob(uid, {
    name: `下载歌单到本地服务器：${playlistInfo.name}`,
    args,
    type: JobType.SyncThePlaylistToLocalService,
    status: JobStatus.Pending,
    desc: `有${songsNeedToSync.length}首歌曲需要下载`,
    progress: 0,
    tip: "等待下载",
    createdAt: Date.now(),
  });

  // async do the job
  (async () => {
    const songs = songsNeedToSync;
    logger.info(`${jobId}: try to sync songs: ${playlistInfo.name}`);
    await JobManager.updateJob(uid, jobId, {
      status: JobStatus.InProgress,
    });
    const succeedList = [];
    const failedList = [];
    // step 2. download the songs
    for (const song of songs) {
      let tip = `[${succeedList.length + failedList.length + 1}/${
        songs.length
      }] 正在下载歌曲：${song.songName}`;
      await JobManager.updateJob(uid, jobId, {
        tip,
      });
      const syncSucceed = await syncSingleSong(uid, song, playlistInfo);
      if (syncSucceed) {
        await JobManager.updateJob(uid, jobId, {
          log: song.songName + ": 下载成功",
        });
        succeedList.push({ songName: song.songName, artist: song.artists[0] });
      } else {
        await JobManager.updateJob(uid, jobId, {
          log: song.songName + ": 下载失败",
        });
        failedList.push({ songName: song.songName, artist: song.artists[0] });
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
      },
    });
  })().catch(async (e) => {
    logger.error(`${jobId}: ${e}`);
    let tip = "遇到不可思议的错误了哦，任务终止";
    await JobManager.updateJob(uid, jobId, {
      status: JobStatus.Failed,
      tip,
    });
  });

  return jobId;
};

async function syncSingleSong(uid, wySongMeta, playlistInfo) {
    const playlistName = playlistInfo.name;
    const playlistID = playlistInfo.id;
  logger.info(`sync single song with meta: ${JSON.stringify(wySongMeta)}`);
  const globalConfig = await configManager.getGlobalConfig();
  let isLossless = false;
  if (globalConfig.playlistSyncToLocal.soundQualityPreference === soundQualityConst.Lossless) {
    isLossless = true;
  }
  // 优先使用官方资源下载
  const playInfo = await getPlayUrlWithType(uid, wySongMeta.songId, isLossless);
  if (playInfo.url) {
    const tmpPath = await downloadViaSourceUrl(playInfo.url);
    if (tmpPath) {
        const collectRet = {};
      const ret = await downloadFromLocalTmpPath(
        tmpPath,
        wySongMeta,
        playlistName,
        collectRet,
        playInfo.type
      );
      if (ret === true) {
        logger.info(`download from official succeed`, wySongMeta,"with type:", playInfo.type," level:", playInfo.level);
        if (collectRet.md5Value) {
            await recordSongIndex(playlistID, wySongMeta.songId, wySongMeta, playlistName, collectRet.md5Value);
        }
        return true;
      }
    }
  }

  // 从公开资源获取
  logger.info(
    `download from official failed, try to download from public resources`,
    wySongMeta
  );

  const songFromWyCloud = await findTheBestMatchFromWyCloud(uid, {
    songName: wySongMeta.songName,
    artist: wySongMeta.artists[0],
    album: wySongMeta.album,
    musicPlatformSongId: wySongMeta.songId,
  });
  // search songs with the meta
  const searchListfilttered = await searchSongsWithSongMeta(
    {
      songName: wySongMeta.songName,
      artist: wySongMeta.artists[0],
      album: wySongMeta.album,
      duration: wySongMeta.duration,
    },
    {
      expectArtistAkas: songFromWyCloud.artists ? songFromWyCloud.artists : [],
      allowSongsJustMatchDuration: false,
      allowSongsNotMatchMeta: false,
    }
  );

  logger.info(
    `use the searchListfilttered: ${JSON.stringify(searchListfilttered)}`
  );
  if (searchListfilttered === false) {
    return false;
  }

  // find the best match song
  for (const searchItem of searchListfilttered) {
    logger.info(`try to the search item: ${JSON.stringify(searchItem)}`);

    const collectRet = {};
    const isSucceed = await syncSingleSongWithUrl(
      uid,
      searchItem.url,
      {
        songName: wySongMeta.songName,
        artist: wySongMeta.artists[0],
        album: wySongMeta.album,
        songFromWyCloud,
      },
      0,
      JobType.SyncThePlaylistToLocalService,
      playlistName,
      collectRet
    );
    if (isSucceed === "IOFailed") {
      logger.error(`not try others due to upload failed.`);
      return false;
    }
    if (isSucceed) {
        if (collectRet.md5Value) {
            await recordSongIndex(playlistID, wySongMeta.songId, wySongMeta, playlistName, collectRet.md5Value);
        }
      return true;
    }
  }
  return false;
}

const SourceWYPlaylist = "wycloudPlaylist";
function recordFileIndex(playlistID, songID, songInfo, playlistName, md5Value) {
  const sourceID = `${playlistID}_${songID}`;
  // no need to await to save time
  KV.fileSyncMeta.set(SourceWYPlaylist, sourceID, {
    songInfo,
    playlistName,
    md5Value,
    createTime: Date.now(),
  });
}

async function getRecordFileIndex(playlistID, songID) {
  const sourceID = `${playlistID}_${songID}`;
  return await KV.fileSyncMeta.get(SourceWYPlaylist, sourceID);
}

async function isNeedToSyncFile(playlistID, songID, cache) {
  const record = await getRecordFileIndex(playlistID, songID);
  if (!record) {
    // logger.info(`no record for ${playlistID}_${songID}, need to sync`);
    return true;
  }

  // use the latest setting to rebuild the dest filename
  // then check:
  // 1. if the file exists(don't check the md5), skip
  // 2. if the file not exists, check if there is a same file under the destFile's dir with the same md5, skip

  const globalConfig = await configManager.getGlobalConfig();
  const destFilename = buildDestFilename(
    globalConfig,
    record.songInfo,
    record.playlistName
  );

  if (await utilFs.asyncFileExisted(destFilename)) {
    // logger.info(`file already exists, skip: ${destFilename}`);
    return false;
  }

  try {
    const dir = path.dirname(destFilename);
    const files = await (async () => {
        if (cache[`dir_files_${dir}`]) {
            return cache[`dir_files_${dir}`];
        }
        const files = await utilFs.asyncReadDir(dir);
        cache[`dir_files_${dir}`] = files;
        return files;
    })();
    for (const file of files) {
        const filename = path.join(dir, file);
        const md5Value = await (async () => {
            if (cache[`md5_${filename}`]) {
                return cache[`md5_${filename}`];
            }
            const md5Value = await utilFs.asyncMd5(filename);
            cache[`md5_${filename}`] = md5Value;
            return md5Value;
        })()
        if (md5Value === record.md5Value) {
            // logger.info(`file already exists with the same md5, skip: ${filename}`);
            return false;
        }
    }
    // logger.info(`no file with the same md5, need to sync: ${destFilename}`);
    return true;
  } catch (e) {
    logger.error(e);
    // logger.info(`error when check the file, need to sync: ${destFilename}`);
    return true;
  }
}

async function recordSongIndex(playlistID, songID, songInfo, playlistName, md5Value) {
    try {
        // 记录单曲信息
        recordFileIndex(playlistID, songID, songInfo, playlistName, md5Value);
        
        // 更新歌单元数据
        const playlistMeta = await KV.fileSyncMeta.getPlaylistMeta(playlistID);
        const songIDs = new Set(playlistMeta.songIDs || []);
        songIDs.add(songID);
        await KV.fileSyncMeta.setPlaylistMeta(playlistID, {
            songIDs: Array.from(songIDs)
        });
        
        logger.info(`Updated playlist meta for song: ${songInfo.songName}`);
    } catch (err) {
        logger.error(`Failed to record song index: ${songInfo.songName}`, err);
        // 不抛出错误,避免影响主流程
    }
}

async function syncDeleteFiles(playlistId, currentSongIDs) {
    try {
        // 获取本地已下载的歌曲记录
        const playlistMeta = await KV.fileSyncMeta.getPlaylistMeta(playlistId);
        const localSongIDs = playlistMeta.songIDs || [];
        
        // 找出需要删除的歌曲(在本地但不在云端的)
        const needDeleteSongIDs = localSongIDs.filter(id => !currentSongIDs.includes(id));
        
        if (needDeleteSongIDs.length === 0) {
            logger.info(`No songs need to be deleted for playlist: ${playlistId}`);
            return;
        }
        
        logger.info(`Found ${needDeleteSongIDs.length} songs to delete for playlist: ${playlistId}`);
        
        // 记录删除结果
        const deletedSongIDs = new Set();
        
        for (const songID of needDeleteSongIDs) {
            const record = await getRecordFileIndex(playlistId, songID);
            if (!record) {
                logger.warn(`No record found for song: ${songID}`);
                continue;
            }

            const globalConfig = await configManager.getGlobalConfig();
            const destFilename = buildDestFilename(globalConfig, record.songInfo, record.playlistName);
            
            try {
                if (await utilFs.asyncFileExisted(destFilename)) {
                    await utilFs.asyncUnlinkFile(destFilename);
                    logger.info(`Deleted file: ${destFilename}`);
                } else {
                    logger.warn(`File not found: ${destFilename}`);
                }
                
                // 删除单曲记录
                const sourceID = `${playlistId}_${songID}`;
                await KV.fileSyncMeta.set(SourceWYPlaylist, sourceID, null);
                
                deletedSongIDs.add(songID);
                logger.info(`Deleted record for song: ${record.songInfo.songName}`);
            } catch (err) {
                logger.error(`Failed to delete song: ${record.songInfo.songName}`, err);
            }
        }
        
        // 更新歌单元数据
        const remainingSongIDs = localSongIDs.filter(id => !deletedSongIDs.has(id));
        await KV.fileSyncMeta.setPlaylistMeta(playlistId, {
            songIDs: remainingSongIDs
        });
        
        logger.info(`Successfully deleted ${deletedSongIDs.size} songs from playlist: ${playlistId}`);
    } catch (err) {
        logger.error(`Failed to sync delete files for playlist: ${playlistId}`, err);
    }
}
