const path = require('path');
const fs = require('fs');
const isWin = require('os').platform().indexOf('win32') > -1;
const ROOT_DIR = `${__dirname}/../`;
const l = m => console.log(m);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function getMediaGetBinPath() {
    return path.join(ROOT_DIR, 'backend', 'bin', `media-get${isWin ? '.exe' : ''}`);
}

async function downloadMediaGetWithRetry() {
    const MediaGetService = require('../backend/src/service/media_fetcher/media_get');
    const maxRetries = 3;
    let retryCount = 0;
    
    // Get latest version first
    const latestVersion = await MediaGetService.getLatestMediaGetVersion();
    if (latestVersion === false) {
        l('Failed to get latest media-get version');
        return false;
    }
    
    while (retryCount < maxRetries) {
        l(`Downloading media-get (attempt ${retryCount + 1})`);
        const success = await MediaGetService.downloadTheLatestMediaGet(latestVersion);
        if (success) {
            return true;
        }
        retryCount++;
        if (retryCount < maxRetries) {
            l(`Download failed, waiting 5 seconds before retry...`);
            await sleep(5000);
        }
    }
    return false;
}

async function run() {
    try {
        l('Starting media-get installation...');
        
        const mediaGetPath = getMediaGetBinPath();
        if (!fs.existsSync(mediaGetPath)) {
            l('Downloading media-get...');
            if (await downloadMediaGetWithRetry() === false) {
                l('Failed to download media-get');
                return false;
            }
            l('Successfully downloaded media-get');
        } else {
            l('media-get already exists');
        }

        return true;
    } catch (error) {
        l('Error during execution:');
        l(error.stack || error.message || error);
        return false;
    }
}

run().then(success => {
    if (!success) {
        l('Setup failed');
        process.exit(1);
    }
    l('Setup completed successfully');
}); 