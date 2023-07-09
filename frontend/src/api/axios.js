import axios from "axios";
const axiosApiInstance = axios.create();
import storage from "../utils/storage"

axiosApiInstance.defaults.baseURL = import.meta.env.VITE_APP_API_URL

//post请求头
//允许跨域携带cookie信息
axiosApiInstance.defaults.withCredentials = true; 
//设置超时
axiosApiInstance.defaults.timeout = 10000;

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
        if (response.status >= 200 && response.status < 300) {
            return Promise.resolve(response);
        } else {
            return Promise.reject(response);
        }
    },
    error => {
        console.log('error in response', error);
        Promise.reject(error);
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
                    reject(err)
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