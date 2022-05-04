const logger = require('consola');
const { getMetaWithUrl } = require('../service/media_fetcher');
const { matchUrlFromStr } = require('../utils/regex');

async function getMeta(req, res) {
    const query = req.query;

    const url = matchUrlFromStr(query.url);

    if (!url) {
        res.send({
            status: 1,
            message: "url is invalid",
        });
        return;
    }

    const songMeta = await getMetaWithUrl(url);
    songMeta && (songMeta.pageUrl = url);

    res.send({
        status: songMeta ? 0 : 1,
        data: {
            songMeta,
        }
    });
}

module.exports = {
    getMeta: getMeta
}