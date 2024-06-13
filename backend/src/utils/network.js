const https = require('https');

function asyncHttpsGet(url) {
    return new Promise((resolve) => {
        https.get(url, res => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                resolve(data.toString());
            });

        }).on('error', err => {
            console.error(err);
            resolve(null);
        });
    });
}

module.exports = {
    asyncHttpsGet
}