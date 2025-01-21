const exec = require('child_process').exec;
const https = require('https');
const path = require('path');
const fs = require('fs');
const isWin = require('os').platform().indexOf('win32') > -1;
const isLinux = require('os').platform().indexOf('linux') > -1;
const isDarwin = require('os').platform().indexOf('darwin') > -1;
const ROOT_DIR = `${__dirname}/../`;
const l = m => console.log(m);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const runCmd = (cmd, shouldOutput = true, cwd = null) => {
    const startTime = new Date();
    const option = cwd ? {cwd} : {};
    const currentCwd = cwd || process.cwd();
    l(`[${startTime.toISOString()}] 开始执行命令: ${cmd}`);
    l(`执行目录: ${currentCwd}`);
    
    return new Promise(r => {
        const childProcess = exec(cmd, option);
        l(`进程ID: ${childProcess.pid}`);
        let result = '';
        let error = '';

        childProcess.stdout.on('data', function(data) {
            shouldOutput && console.log(data); 
            result += data.toString();
        });
    
        childProcess.stderr.on('data', (data) => {
            shouldOutput && console.log(data); 
            error += data.toString();
        })
    
        childProcess.on('exit', (code, signal) => {
            const endTime = new Date();
            const duration = (endTime - startTime) / 1000;
            l(`[${endTime.toISOString()}] 命令执行完成，耗时: ${duration}秒`);
            if (signal) {
                l(`进程被信号 ${signal} 终止`);
            }
            l(`退出码: ${code}`);
            r({code, signal, result, error})
        })
    });
}

const runCmdAndExitWhenFailed = async (cmd, msg, shouldOutput = true, cwd = null) => {
    l('----------------------------------------');
    l(`执行命令: ${cmd}`);
    l(`工作目录: ${cwd || process.cwd()}`);
    const ret = await runCmd(cmd, shouldOutput, cwd);
    if (ret.code !== 0 || ret.code === null) {
        l('命令执行失败:');
        l(msg);
        l(`命令: ${cmd}`);
        l(`工作目录: ${cwd || process.cwd()}`);
        l('退出码: ' + ret.code);
        l('错误输出: ' + ret.error);
        l('标准输出: ' + ret.result);
        l('系统信息:');
        l(`- 平台: ${process.platform}`);
        l(`- 架构: ${process.arch}`);
        l(`- Node版本: ${process.version}`);
        l(`- 内存使用: ${JSON.stringify(process.memoryUsage())}`);
        process.exit(1);
    }
    l('----------------------------------------');
    return ret;
}

function getMediaGetBinPath() {
    return path.join(ROOT_DIR, 'backend', 'bin', `media-get${isWin ? '.exe' : ''}`);
}

async function checkAndUpdateMediaGet(currentMediaGetVersion) {
    const MediaGetService = require('../backend/src/service/media_fetcher/media_get');

    const latestVersion = await MediaGetService.getLatestMediaGetVersion();
    if (latestVersion === false) {
        return;
    }
    if (currentMediaGetVersion.localeCompare(latestVersion, undefined, { numeric: true, sensitivity: 'base' }) >= 0) {
        l('当前 media-get 版本已经是最新版本');
        return;
    }
    l(`当前 media-get(${currentMediaGetVersion})版本不是最新版本, 开始更新到${latestVersion}`);
    await MediaGetService.downloadTheLatestMediaGet(latestVersion);
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

async function downloadMediaGetWithRetry(latestVersion) {
    const MediaGetService = require('../backend/src/service/media_fetcher/media_get');
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
        l(`尝试下载 media-get (第 ${retryCount + 1} 次尝试)`);
        const success = await MediaGetService.downloadTheLatestMediaGet(latestVersion);
        if (success) {
            return true;
        }
        retryCount++;
        if (retryCount < maxRetries) {
            l(`下载失败,等待 5 秒后重试...`);
            await sleep(5000);
        }
    }
    return false;
}

async function run() {
    try {
        l('开始执行...');
        
        // 检查 FFmpeg 安装和位置
        l('检查 FFmpeg 安装状态...');
        if (!process.env.CROSS_COMPILING) {
            const ffmpegRet = await runCmd('which ffmpeg && ls -l $(which ffmpeg)', true);
            l('FFmpeg location and permissions:');
            l(ffmpegRet.result);
            await runCmdAndExitWhenFailed('ffmpeg -version', '请先安装 ffmpeg', false);
        } else {
            l('跳过 FFmpeg 检查 (CROSS_COMPILING=1)');
        }
        
        await runCmdAndExitWhenFailed('npm version', '请先安装 npm', false);

        const pm = await getPackageManager();
        l(`安装 node_module via ${pm}`)
        l('开始安装后端依赖...');
        l(`执行命令: ${pm} install --production --verbose in ${path.join(ROOT_DIR, 'backend')}`);
        const backendInstallResult = await runCmdAndExitWhenFailed(`${pm} install --production --verbose`, '安装后端 node_module 失败', true, path.join(ROOT_DIR, 'backend'));
        l('后端依赖安装结果:');
        l('Exit code: ' + backendInstallResult.code);
        l('Output: ' + backendInstallResult.result);
        if (backendInstallResult.error) {
            l('Error output: ' + backendInstallResult.error);
        }

        l('检查 media-get');
        const MediaGetService = require('../backend/src/service/media_fetcher/media_get');

        const mediaGetPath = getMediaGetBinPath();
        l(`检查 media-get 权限: ${mediaGetPath}`);
        await runCmd(`ls -l ${mediaGetPath}`, true);

        if (!fs.existsSync(mediaGetPath)) {
            const latestVersion = await MediaGetService.getLatestMediaGetVersion();
            if (latestVersion === false) {
                l('获取 media-get 最新版本失败，无法继续安装');
                return false;
            }
            l('开始下载核心程序 media-get');
            if (await downloadMediaGetWithRetry(latestVersion) === false) {
                l('下载核心程序 media-get 失败');
                return false;
            }
        } else {
            const currentMediaGetVersion = await MediaGetService.getLatestMediaGetVersion();
            await checkAndUpdateMediaGet(currentMediaGetVersion);
        }

        l('开始安装前端依赖...');
        const frontendInstallResult = await runCmdAndExitWhenFailed(`${pm} install --verbose`, '安装前端 node_module 失败', true, path.join(ROOT_DIR, 'frontend'));
        l('前端依赖安装结果:');
        l('Exit code: ' + frontendInstallResult.code);
        l('Output: ' + frontendInstallResult.result);
        if (frontendInstallResult.error) {
            l('Error output: ' + frontendInstallResult.error);
        }

        l('开始编译前端...');
        const buildResult = await runCmdAndExitWhenFailed(`${pm} run build`, '前端编译失败', true, path.join(ROOT_DIR, 'frontend'));
        l('前端编译结果:');
        l('Exit code: ' + buildResult.code);
        l('Output: ' + buildResult.result);
        if (buildResult.error) {
            l('Error output: ' + buildResult.error);
        }

        l('删除老目录');
        try {
            fs.rmdirSync(path.join(ROOT_DIR, 'backend', 'public'), { recursive: true });
        } catch(e) {
            l('删除老目录失败，但继续执行: ' + e.message);
        }
        
        l('拷贝前端目录');
        try {
            copyDir(path.join(ROOT_DIR, 'frontend', 'dist'), path.join(ROOT_DIR, 'backend', 'public'));
        } catch(e) {
            l('拷贝前端目录失败: ' + e.message);
            return false;
        }

        return true;
    } catch (error) {
        l('执行过程中出现错误:');
        l(error.stack || error.message || error);
        return false;
    }
}

run().then(isFine => {
    l(isFine ? `执行完毕，执行以下命令启动服务：\r\n\r\nnpm run app` : '执行出错，请检查');
    if (!isFine) {
        process.exit(1);
    }
});