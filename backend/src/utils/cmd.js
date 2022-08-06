const logger = require("consola");
const spawnAsync = require("child_process").spawn;

module.exports = function exec(exe, args) {
  return new Promise(function (resolve, reject) {
    console.log(exe, args);
    const process = spawnAsync(exe, args);
    let stdout = "";
    let stderr = "";

    process.stdout.on("data", function (data) {
        stdout += data;
    });
    process.stderr.on("data", function (data) {
      stderr += data;
    });

    process.on("close", function (code) {
      resolve({
        code: stderr ? code : 0,
        message: stderr ? stderr: stdout,
      });
    });
    process.on("error", function (error) {
      logger.error('exec error: ', error);
      resolve({
        code: -1,
        message: error.message,
      });
    });
  });
}