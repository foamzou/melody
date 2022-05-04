export default {
    set (key, val) {
        if (typeof val === 'object') {
            val = JSON.stringify(val)
        }
        window.localStorage.setItem(key, val)
    },
    get (key) {
        let data = window.localStorage.getItem(key)
        try {
            data = JSON.parse(data);
            return data;
        } catch {
            return data;
        }
    },
    del (key) {
        window.localStorage.removeItem(key)
    },
}