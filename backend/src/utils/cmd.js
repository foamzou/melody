const logger = require('consola');
const execAsync = require('child_process').exec;

module.exports = function exec(cmd) {
    return new Promise((resolve, reject) => {
        execAsync(cmd, (error, stdout, stderr) => {
            if (error) {
                logger.error(`exec error: ${error}`);
                resolve({
                    code: error.code,
                    message: error.message
                });
                return;
            }
            if (stderr) {
                logger.error(`exec stderr: ${stderr}`);
                return;
            }
            resolve({
                code: 0,
                message: stdout
            });
        });
    });
}