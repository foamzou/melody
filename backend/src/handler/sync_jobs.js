const logger = require('consola');
const { unblockMusicInPlaylist, unblockMusicWithSongId } = require('../service/sync_music');
const JobType = require('../consts/job_type');
const Source = require('../consts/source').consts;
const { matchUrlFromStr } = require('../utils/regex');
const { syncSingleSongWithUrl } = require('../service/sync_music');
const findTheBestMatchFromWyCloud = require('../service/search_songs/find_the_best_match_from_wycloud');
const JobManager = require('../service/job_manager');
const JobStatus = require('../consts/job_status');
const BusinessCode = require('../consts/business_code');


async function createJob(req, res) {
    const uid = req.account.uid;
    const request = req.body;

    const jobType = request.jobType;
    let jobId = 0;

    if (jobType === JobType.UnblockedPlaylist) {
        const source = request.playlist && request.playlist.source;
        const playlistId = request.playlist && request.playlist.id;

        if (source !== Source.Netease.code || !playlistId) {
            res.status(429).send({
                status: 1,
                message: "source or id is invalid",
            });
            return;
        }
        jobId = await unblockMusicInPlaylist(uid, source, playlistId)
    } else if (jobType === JobType.UnblockedSong) {
        const source = request.source;
        const songId = request.songId;

        if (source !== Source.Netease.code || !songId) {
            res.status(429).send({
                status: 1,
                message: "source or id is invalid",
            });
            return;
        }
        jobId = await unblockMusicWithSongId(uid, source, songId)
    } else if (jobType === JobType.SyncSongFromUrl) {
        const request = req.body;
        const url = request.urlJob && matchUrlFromStr(request.urlJob.url);

        if (!url) {
            res.status(429).send({
                status: 1,
                message: "url is invalid",
            });
            return;
        }

        let meta = {};
        const songId = request.urlJob && request.urlJob.meta.songId ? request.urlJob.meta.songId : "";
    
        if (request.urlJob.meta && (request.urlJob.meta.songName !== "" && request.urlJob.meta.artist !== "")) {
            meta = {
                songName: request.urlJob.meta.songName,
                artist: request.urlJob.meta.artist,
                album : request.urlJob.meta.album ? request.urlJob.meta.album : "",
            };
        }
    
        if (songId) {
            const songFromWyCloud = await findTheBestMatchFromWyCloud(req.account.uid, {
                songName: meta.songName,
                artist: meta.artist,
                album: meta.album,
                musicPlatformSongId: songId,
            });
            if (!songFromWyCloud) {
                logger.error(`song not found in wycloud`);
                res.status(429).send({
                    status: 1,
                    message: "can not find song in wycloud with your songId",
                });
                return;
            }
            meta.songFromWyCloud = songFromWyCloud;
        }
    
        // create job
        const args = `SyncSongFromUrl: {"url":${url}}`;
        if (await JobManager.findActiveJobByArgs(uid, args)) {
            logger.info(`SyncSongFromUrl job is already running.`);
            jobId = BusinessCode.StatusJobAlreadyExisted;
        } else {
            jobId = await JobManager.createJob(uid, {
                name: `上传歌曲：${meta.songName ? meta.songName : url}`,
                args,
                type: JobType.SyncSongFromUrl,
                status: JobStatus.Pending,
                desc: `歌曲：${meta.songName ? meta.songName : url}`,
                progress: 0,
                tip: "等待上传",
                createdAt: Date.now()
            });
    
            // async job
            syncSingleSongWithUrl(req.account.uid, url, meta, jobId).then(async ret => {
                await JobManager.updateJob(uid, jobId, {
                    status: ret ? JobStatus.Finished : JobStatus.Failed,
                    progress: 1,
                    tip: ret ? "上传成功" : "上传失败",
                });
            })
        }
    } else {
        res.status(429).send({
            status: 1,
            message: "jobType is not supported",
        });
        return;
    }

    if (jobId === false) {
        logger.error(`create job failed, uid: ${uid}`);
        res.status(429).send({
            status: 1,
            message: "create job failed",
        });
        return;
    }

    if (jobId === BusinessCode.StatusJobAlreadyExisted) {
        res.status(429).send({
            status: BusinessCode.StatusJobAlreadyExisted,
            message: "你的任务已经在跑啦，等等吧",
        });
        return;
    }

    res.status(201).send({
        status: jobId ? 0 : 1,
        data: {
            jobId,
        }
    });
}

async function listAllJobs(req, res) {
    res.send({
        status: 0,
        data: {
            jobs: await JobManager.listJobs(req.account.uid),
        }
    });
}

async function getJob(req, res) {
    res.send({
        status: 0,
        data: {
            jobs: await JobManager.getJob(req.account.uid, req.params.id),
        }
    });
}

module.exports = {
    createJob: createJob,
    listAllJobs: listAllJobs,
    getJob: getJob,
}