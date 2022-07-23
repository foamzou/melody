import { getJobDetail } from "../api";
import { Notify } from 'vant';

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
                type = 'success';
                duration = 6000;
            } else if (status === '失败') {
                type = 'danger';
            } else {
                title = '任务进度提示';
                type = 'primary';
                duration = 2500;
            }

            if (lastTip == "") {
                duration = 4500;
            }

            Notify({
                message: `${res.data.jobs.tip}\n${res.data.jobs.name}\n${res.data.jobs.desc}`,
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

