const logger = require('consola');
const got = require('got');

async function proxyAudio(req, res) {
    const url = req.query.url;
    const source = req.query.source;
    const referer = req.query.referer;
    
    if (!url || !source) {
        res.status(400).send({
            status: 1,
            message: "url and source are required"
        });
        return;
    }

    // 只允许 bilibili 源
    if (source !== 'bilibili') {
        res.status(403).send({
            status: 1,
            message: "only bilibili source is allowed"
        });
        return;
    }

    try {
        const stream = got.stream(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
                'Referer': referer || 'https://www.bilibili.com'
            }
        });
        
        stream.pipe(res);
    } catch (err) {
        logger.error('proxy audio error:', err);
        res.status(500).send({
            status: 1,
            message: "proxy failed"
        });
    }
}

module.exports = {
    proxyAudio
}; 