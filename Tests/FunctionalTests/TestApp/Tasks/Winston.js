var winston= require('winston');
winston.level = 'silly';

function logFn(type) {
    return (callback) => {
        winston.log(type, "test %s", type);
        callback();
    }
}

function logFn2(type) {
    return (callback) => {
        winston[type]("test %s", type);
        callback();
    }
}


module.exports = {
    error: logFn('error'),
    warn: logFn('warn'),
    info: logFn('info'),
    verbose: logFn('verbose'),
    debug: logFn('debug'),
    silly: logFn('silly'),
    error2: logFn2('error'),
    warn2: logFn2('warn'),
    info2: logFn2('info')
}