module.exports = {
    matchUrlFromStr: (str) => {
        const matched = str.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/);
        if (!matched) {
            return false;
        }
        return matched[0];
    }
}