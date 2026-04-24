const logger = require('consola');
const { getMediaGetInfo, getLatestMediaGetVersion, downloadTheLatestMediaGet } = require('../service/media_fetcher/media_get');

async function checkLibVersion(req, res) {
    const query = req.query;

    if (!['mediaGet'].includes(query.lib)) {
        res.send({
            status: 1,
            message: "lib name is invalid",
        });
        return;
    }

    const latestVersion = await getLatestMediaGetVersion();
    const mediaGetInfo = await getMediaGetInfo();
    
    // 获取环境信息
    const os = require('os');
    let platform = os.platform();
    let arch = os.arch();
    
    // 标准化平台名称
    if (platform === 'win32') {
        platform = 'windows';
    } else if (platform === 'darwin') {
        platform = 'macos';
    }
    
    // 标准化架构名称
    if (arch === 'x64') {
        arch = 'amd64';
    } else if (arch === 'arm64') {
        arch = 'arm';
    }
    
    const environment = `${platform}-${arch}`;

    res.send({
        status: 0,
        data: {
            mediaGetInfo,
            latestVersion,
            environment,
        }
    });
}

async function downloadTheLatestLib(req, res) {
    const {version} = req.body;

    const succeed = await downloadTheLatestMediaGet(version);

    res.send({
        status: succeed ? 0 : 1,
        data: {}
    });
}

async function uploadMediaFetcherLib(req, res) {
    try {
        if (!req.file) {
            res.send({
                status: 1,
                message: "No file uploaded",
            });
            return;
        }

        const fs = require('fs');
        const path = require('path');
        const { getBinPath, getMediaGetInfo } = require('../service/media_fetcher/media_get');
        
        // 保存上传的文件到临时位置
        const tempBinPath = getBinPath(true);
        fs.writeFileSync(tempBinPath, req.file.buffer);
        
        // 设置文件权限
        const isWin = require('os').platform().indexOf('win32') > -1;
        if (!isWin) {
            fs.chmodSync(tempBinPath, '755');
        }
        
        // 验证文件可用性
        const tempBinInfo = await getMediaGetInfo(true);
        if (!tempBinInfo || tempBinInfo.versionInfo === "") {
            // 清理临时文件
            if (fs.existsSync(tempBinPath)) {
                fs.unlinkSync(tempBinPath);
            }
            res.send({
                status: 1,
                message: "Invalid media-get file",
            });
            return;
        }
        
        // 替换原始文件
        const originalBinPath = getBinPath();
        if (fs.existsSync(originalBinPath)) {
            fs.unlinkSync(originalBinPath);
        }
        fs.renameSync(tempBinPath, originalBinPath);
        
        res.send({
            status: 0,
            data: {
                message: "Upload successful",
                versionInfo: tempBinInfo.versionInfo
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.send({
            status: 1,
            message: "Upload failed",
        });
    }
}

module.exports = {
    checkLibVersion: checkLibVersion,
    downloadTheLatestLib: downloadTheLatestLib,
    uploadMediaFetcherLib: uploadMediaFetcherLib,
}
