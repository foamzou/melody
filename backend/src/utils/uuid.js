const { v4: uuidv4 } = require('uuid');

module.exports = function () {
    return uuidv4().replace(/-/g, '');
}