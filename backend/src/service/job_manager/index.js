const logger = require('consola');
const asyncFs = require('../../utils/fs');
const genUUID = require('../../utils/uuid');
const { lock, unlock } = require('../../utils/simple_locker');
const JobStatus = require('../../consts/job_status');

const DataPath = `${__dirname}/../../../.profile/data`;
const JobDataPath = `${DataPath}/jobs`;

async function listJobs(uid) {
    const list = [];
    const jobs = await getUserJobs(uid);
    for (const jobId in jobs) {
        const job = await getJob(uid, jobId);
        job.id = jobId;
        list.push(job);
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
}

async function getJob(uid, jobId) {
    const jobFile = await getJobFilePath(uid, jobId, false);
    if (!await asyncFs.asyncFileExisted(jobFile)) {
        return null;
    }
    return JSON.parse(await asyncFs.asyncReadFile(jobFile));
}

async function updateJob(uid, jobId, info) {
    const lockKey = getJobLockKey(jobId);
    if (!await lock(lockKey, 5)) {
        logger.error(`get job locker failed, uid: ${uid}, job: ${jobId}`);
        return false;
    }
    const job = await getJob(uid, jobId);
    if (info.desc) {
        job.desc = info.desc;
    }
    if (info.progress) {
        job.progress = info.progress;
    }
    if (info.status) {
        job.status = info.status;
    }
    if (info.tip) {
        job.tip = info.tip;
        if (!info.log) {
            info.log = info.tip
        }
    }
    if (info.log) {
        if (!job.logs) {
            job.logs = [];
        }
        job.logs.push({
            time: Date.now(),
            info: info.log
        });
    }
    if (info.data) {
        job.data = info.data;
    }
    const jobFile = await getJobFilePath(uid, jobId);
    await asyncFs.asyncWriteFile(jobFile, JSON.stringify(job));
    
    unlock(lockKey);
}

async function createJob(uid, job = {
    name: '',
    type: '',
    desc: '',
    progress: 0,
    tip: '',
    status: '',
    logs: [],
    data: {},
    createdAt: Date.now(),
}) {
    const jobId = genUUID();
    const jobFile = await getJobFilePath(uid, jobId);
    await asyncFs.asyncWriteFile(jobFile, JSON.stringify(job));
    
    await addJobIdToUserJobList(uid, jobId);
    return jobId;
}

async function deleteJob(uid, jobId) {
    await removeJobIdFromUserJobList(uid, jobId);
    await asyncFs.asyncUnlinkFile(await getJobFilePath(uid, jobId, false));
}

async function addJobIdToUserJobList(uid, jobId) {
    const lockKey = getJobListLockKey(uid);
    if (!await lock(lockKey, 5)) {
        logger.error(`get job_list locker failed, uid: ${uid}`);
        return false;
    }
    const jobs = await getUserJobs(uid);
    jobs[jobId] = {
        createdAt: Date.now(),
    };
    await asyncFs.asyncWriteFile(await getJobListFilePath(uid), JSON.stringify(jobs));
    unlock(lockKey);
}

async function removeJobIdFromUserJobList(uid, jobId) {
    const lockKey = getJobListLockKey(uid);
    if (!await lock(lockKey, 5)) {
        logger.error(`get job_list locker failed, uid: ${uid}`);
        return false;
    }
    const jobs = await getUserJobs(uid);
    delete jobs[jobId];
    await asyncFs.asyncWriteFile(await getJobListFilePath(uid), JSON.stringify(jobs));
    unlock(lockKey);
}

function getJobListLockKey(uid) {
    return `job_list_${uid}`;
}

function getJobLockKey(jobId) {
    return `job_${jobId}`;
}

async function getUserJobs(uid) {
    const jobListFile = await getJobListFilePath(uid);
    return JSON.parse(await asyncFs.asyncReadFile(jobListFile));
}

async function getJobFilePath(uid, jobId, createIfNotExist = true) {
    const path = `${await getUserJobPath(uid)}/${jobId}`;
    if (createIfNotExist && !await asyncFs.asyncFileExisted(path)) {
        await asyncFs.asyncWriteFile(path, '{}');
    }
    return path;
}

async function getJobListFilePath(uid, createIfNotExist = true) {
    const path = `${await getUserJobPath(uid)}/list`;
    if (createIfNotExist && !await asyncFs.asyncFileExisted(path)) {
        await asyncFs.asyncWriteFile(path, '{}');
    }
    return path;
}

async function getUserJobPath(uid, createIfNotExist = true) {
    const path = `${JobDataPath}/${uid}`;
    if (createIfNotExist && !await asyncFs.asyncFileExisted(path)) {
        await asyncFs.asyncMkdir(path, { recursive: true });
    }
    return path;
}

async function findActiveJobByArgs(uid, args) {
    const jobs = await listJobs(uid);
    return jobs.find(job => {
        if (job['args'] === args && job['status'] !== JobStatus.Failed && job['status'] !== JobStatus.Finished) {
            return job;
        }
    });
}

module.exports = {
    listJobs: listJobs,
    createJob: createJob,
    findActiveJobByArgs: findActiveJobByArgs,
    deleteJob: deleteJob,
    getJob: getJob,
    updateJob: updateJob,
}