var bunyan = require('bunyan');
var log = bunyan.createLogger({name: 'TestApp', level: 0});

function logFn(type) {
    return (callback) => {
        log[type]("test %s", type);
        callback();
    }
}

module.exports = {
    fatal: logFn('fatal'),
    error: logFn('error'),
    warn: logFn('warn'),
    info: logFn('info'),
    debug: logFn('debug'),
    trace: logFn('trace')
}