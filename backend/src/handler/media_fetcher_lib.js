const logger = require('consola');
const { getMediaGetInfo, getLatestMediaGetVersion, downloadTheLatestMediaGet } = require('../service/media_fetcher/media_get');

async function checkLibVersion(req, res) {
    const query = req.query;

    if (!['mediaGet'].includes(query.lib)) {
        res.send({
            status: 1,
            message: "lib name is invalid",
        });
        return;
    }

    const latestVersion = await getLatestMediaGetVersion();
    const mediaGetInfo = await getMediaGetInfo();

    res.send({
        status: 0,
        data: {
            mediaGetInfo,
            latestVersion,
        }
    });
}

async function downloadTheLatestLib(req, res) {
    const {version} = req.body;

    const succeed = await downloadTheLatestMediaGet(version);

    res.send({
        status: succeed ? 0 : 1,
        data: {}
    });
}

module.exports = {
    checkLibVersion: checkLibVersion,
    downloadTheLatestLib: downloadTheLatestLib,
}