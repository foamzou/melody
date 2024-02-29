const https = require('https');

function asyncHttpsGet(url) {
    return new Promise((resolve) => {
        https.get(url, res => {
            res.on('data', data => {
                resolve(data.toString());
            })
            res.on('error', err => {
                l(err);
                resolve(null);
            })
        });
    });
}

module.exports = {
    asyncHttpsGet
}