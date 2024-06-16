const got = require('got');
const fs = require('fs');
const pipeline = require('stream').pipeline;
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);


module.exports = async function downloadFile(url, destination) {
    try {
        await streamPipeline(
            got.stream(url),
            fs.createWriteStream(destination)
        );
        return true;
    } catch (error) {
        console.error('download failed:', error);
        return false;
    }
    
}