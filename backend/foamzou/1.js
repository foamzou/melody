const process = require('process');
const { getJob } = require('../src/service/job_manager');
const JobManager = require('../src/service/job_manager');
// listJobs: listJobs,
// createJob: createJob,
// deleteJob: deleteJob,
// getJob: getJob,
// updateJob: updateJob,

async function aa() {
    const uid = 'fsasf';
    console.log(JobManager.listJobs(uid));
    
    // const jobId = await JobManager.createJob(uid, {
    //     name: 'haha',
    //     type: 'playlist',
    //     progress: 12,
    //     status: 'pending',
    //     createdAt: Date.now(),
    // });
    const jobId = 'bbc90b90c2014dc29fa2b37db16a7173';
    
    // await JobManager.updateJob(uid, jobId, "ff", "43", "ppp" );
    await JobManager.deleteJob(uid, jobId);
    console.log(getJob(uid, jobId))
    console.log('finish')
}

aa().then( _ => {
    process.exit(0);
});
