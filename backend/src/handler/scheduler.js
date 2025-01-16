const schedulerService = require('../service/scheduler');
const AccountService = require('../service/account');

async function getNextRun(req, res) {
    const localNextRun = schedulerService.getLocalSyncNextRun();
    const accounts = await AccountService.getAllAccounts();
    
    const cloudNextRuns = {};
    for (const uid in accounts) {
        const nextRun = schedulerService.getCloudSyncNextRun(uid);
        if (nextRun) {
            cloudNextRuns[uid] = nextRun;
        }
    }

    res.send({
        status: 0,
        data: {
            localNextRun,
            cloudNextRuns
        }
    });
}

module.exports = {
    getNextRun
};
