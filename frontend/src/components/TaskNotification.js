import { ElNotification } from 'element-plus'
import { getJobDetail } from "../api";

export function startTaskListener(jobID) {
    let lastTip = '';

    const task = (jobID) => {
        getJobDetail(jobID).then(res => {
            const status = res.data.jobs.status;
            if (status === '已完成' || status === '失败') {
                clearInterval(interval)
            }
            if (lastTip == res.data.jobs.tip) {
                return;
            };
            lastTip = res.data.jobs.tip;

            let title;
            let type;
            let duration = 4500;
            if (status === '已完成') {
                title = '任务完成';
                type = 'success';
                duration = 6000;
            } else if (status === '失败') {
                title = '任务失败';
                type = 'error';
            } else {
                title = '任务进度提示';
                type = 'info';
                duration = 2500;
            }

            if (lastTip == "") {
                duration = 4500;
            }

            ElNotification({
                title,
                message: "<strong>" + res.data.jobs.name + "</strong><br>" + "<strong>" + res.data.jobs.desc + "</strong><br>" + res.data.jobs.tip,
                dangerouslyUseHTMLString: true,
                type,
                duration,
            });
        })
    };

    task(jobID);
    const interval = setInterval(() => {
        task(jobID);
    }, 1000)
}

