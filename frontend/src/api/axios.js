import axios from "axios";
const axiosApiInstance = axios.create();
import storage from "../utils/storage"

axiosApiInstance.defaults.baseURL = import.meta.env.VITE_APP_API_URL

//post请求头
//允许跨域携带cookie信息
axiosApiInstance.defaults.withCredentials = true; 
//设置超时
axiosApiInstance.defaults.timeout = 12000;

axiosApiInstance.interceptors.request.use(
    config => {
        config.headers = {
            'mk': (config.params && config.params['mk']) ? config.params['mk'] : storage.get('mk')
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

axiosApiInstance.interceptors.response.use(
    response => {
        return Promise.resolve(response);
    },
    error => {
        // 返回错误响应中的数据
        if (error.response && error.response.data) {
            return Promise.resolve(error.response);
        }
        // 如果没有response.data，返回一个统一的错误格式
        return Promise.resolve({
            data: {
                code: -1,
                message: error.message || '网络错误'
            }
        });
    }
);

export const post = (url, data) => {
    return new Promise((resolve, reject) => {
        axiosApiInstance({
                method: 'post',
                url,
                data,
            })
            .then(res => {
                resolve(res ? res.data : false)
            })
            .catch(err => {
                reject(err.data)
            });
    })
};

export const get = (url, data) => {
    return new Promise((resolve, reject) => {
        axiosApiInstance({
                method: 'get',
                url,
                params: data,
            })
            .then(res => {
                resolve(res ? res.data : false)
            })
            .catch(err => {
                reject(err)
            })
    })
}