const exec = require('child_process').exec;
const https = require('https');
const path = require('path');
const fs = require('fs');
const isWin = require('os').platform().indexOf('win32') > -1;
const isLinux = require('os').platform().indexOf('linux') > -1;
const isDarwin = require('os').platform().indexOf('darwin') > -1;
const ROOT_DIR = `${__dirname}/../`;
const l = m => console.log(m);

const runCmd = (cmd, shouldOutput = true, cwd = null) => {
    return new Promise(r => {
        const option = cwd ? {cwd} : {};
        const process = exec(cmd, option);
        let result;

        process.stdout.on('data', function(data) {
            shouldOutput && console.log(data); 
            result = data.toString();
        });
    
        process.stderr.on('data', (error) => {
            shouldOutput && console.log(error); 
        })
    
        process.on('exit', code => {
            r({code, result})
        })
    });
}

const runCmdAndExitWhenFailed = async (cmd, msg, shouldOutput = true, cwd = null) => {
    const ret = await runCmd(cmd, shouldOutput, cwd);
    if (ret.code !== 0) {
        l(msg);
        process.exit(1);
    }
    return ret;
}

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

function getMediaGetBinPath() {
    return path.join(ROOT_DIR, 'backend', 'bin', `media-get${isWin ? '.exe' : ''}`);
}

function getMediaGetRemoteFilename(latestVersion) {
    let suffix = 'win.exe';
    if (isLinux) {
        suffix = 'linux';
    }
    if (isDarwin) {
        suffix = 'darwin';
    }
    if (process.arch === 'arm64') {
        suffix += '-arm64';
    }
    return `https://ghproxy.com/https://github.com/foamzou/media-get/releases/download/v${latestVersion}/media-get-${latestVersion}-${suffix}`;
}

async function downloadFile(url, filename) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            res.pipe(fs.createWriteStream(filename));
            res.on('end', () => {
                resolve();
            }
            );
        }
        );
    });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getLatestMediaGetVersion() {
    const latestVerisonUrl = 'https://ghproxy.com/https://raw.githubusercontent.com/foamzou/media-get/main/LATEST_VERSION';
    // download the file
    const latestVersion = await asyncHttpsGet(latestVerisonUrl);
    if (latestVersion === null || (latestVersion || "").split('.').length !== 3) {
        l('?????? media-get ?????????????????????, got: ' + latestVersion);
        return false;
    }
    return latestVersion;
}

async function downloadTheLatestMediaGet(latestVersion = "") {
    if (!latestVersion) {
        latestVersion = await getLatestMediaGetVersion();
        if (latestVersion === false) {
            return false;
        }
    }
    const remoteFile = getMediaGetRemoteFilename(latestVersion);
    l('???????????? media-get: ' + remoteFile);
    await downloadFile(remoteFile, getMediaGetBinPath());
    fs.chmodSync(getMediaGetBinPath(), '755');
    await sleep(800);
    l('download finished');
}

async function checkAndUpdateMediaGet(currentMediaGetVersion) {
    const latestVersion = await getLatestMediaGetVersion();
    if (latestVersion === false) {
        return;
    }
    if (currentMediaGetVersion.localeCompare(latestVersion, undefined, { numeric: true, sensitivity: 'base' }) >= 0) {
        l('?????? media-get ???????????????????????????');
        return;
    }
    l(`?????? media-get(${currentMediaGetVersion})????????????????????????, ???????????????${latestVersion}`);
    await downloadTheLatestMediaGet(latestVersion);
}

function copyDir(src, dest) {
    fs.mkdirSync(dest);
    fs.readdirSync(src).forEach(file => {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        if (fs.statSync(srcPath).isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    });
}

async function getPackageManager() {
    let ret = await runCmd('pnpm --version', false);
    if (ret.code === 0) {
        return 'pnpm';
    }
    ret = await runCmd('yarn --version', false);
    if (ret.code === 0) {
        return 'yarn';
    }

    return 'npm';
}

async function run(inDocker) {
    l('????????????...');
    await runCmdAndExitWhenFailed('npm version', '???????????? npm', false);
    !inDocker && await runCmdAndExitWhenFailed('ffmpeg -version', '???????????? ffmpeg', false);

    l('?????? media-get');
    const mediaGetRet = await runCmd(`${getMediaGetBinPath()} -h`, false);
    if (mediaGetRet.code !== 0) {
        l('???????????????????????? media-get');
        if (await downloadTheLatestMediaGet() === false) {
            l('?????????????????? media-get ??????');
            return false;
        }
        l('???????????? media-get ??????????????????');
        await runCmdAndExitWhenFailed(`${getMediaGetBinPath()} -h`, `media-get ??????????????????????????? https://github.com/foamzou/media-get/releases ????????????????????? ${getMediaGetBinPath()}`, false);
    } else {
        const currentMediaGetVersion = mediaGetRet.result.match(/Version: (.+?)\n/)[1];
        await checkAndUpdateMediaGet(currentMediaGetVersion);
        l('?????? media-get ??????????????????');
        await runCmdAndExitWhenFailed(`${getMediaGetBinPath()} -h`, `media-get ??????????????????????????? https://github.com/foamzou/media-get/releases ????????????????????? ${getMediaGetBinPath()}`, false);
    }
    const pm = await getPackageManager();

    l('?????? node_module')
    await runCmdAndExitWhenFailed(`${pm} install --production`, '???????????? node_module ??????', true, path.join(ROOT_DIR, 'backend'))
    await runCmdAndExitWhenFailed(`${pm} install`, '???????????? node_module ??????', true, path.join(ROOT_DIR, 'frontend'))

    l('????????????')
    await runCmdAndExitWhenFailed(`${pm} run build`, '???????????? node_module ??????', true, path.join(ROOT_DIR, 'frontend'))

    l('???????????????')
    try {
        fs.rmdirSync(path.join(ROOT_DIR, 'backend', 'public'), { recursive: true });
    } catch(e) {}
    
    l('??????????????????')
    copyDir(path.join(ROOT_DIR, 'frontend', 'dist'), path.join(ROOT_DIR, 'backend', 'public'));

    return true;
}

const inDocker = process.env.MELODY_IN_DOCKER;

run(inDocker).then( isFine => {
    l(isFine ? `????????????????????????????????????????????????\r\n\r\nnpm run app` : '????????????????????????');
});