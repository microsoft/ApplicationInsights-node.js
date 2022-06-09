var Config = require("./config");
var Utils = require("./utils");

/** @param {string} url */
function getOk(url) {
    return Utils.HTTP.get(url).then(res => {
        return res === "OK";
    }).catch(err => {
        return false;
    });
}

/** @param {string} url */
function waitForOk(url, tries) {
    return getOk(url).then(ok => {
        if (!ok && (tries || 0) < 20) {
            Utils.Logging.info("Waiting for TestApp...");
            return new Promise( (resolve, reject)=> {
                setTimeout(() => resolve(waitForOk(url, (tries || 0) + 1)), 500);
            });
        } else if (!ok) {
            throw new Error("TestApp could not be reached!");
        }
        return true;
    });
}

function sendConfiguration(configuration) {
    Utils.Logging.info("Configuring TestApp...");
    return Utils.HTTP.post(Config.TestAppAddress + "/_configure", configuration).then(res => {
        if (res !== "OK") {
            throw new Error("Could not register configuration!");
        }
    });
}

module.exports.startConnection = (configuration) => {
    return Utils.Logging.enterSubunit("Connecting to TestApp")
        .then(() => waitForOk(Config.TestAppAddress))
        .then(() => sendConfiguration(configuration))
        .then(() => Utils.Logging.exitSubunit());
}

module.exports.closeConnection = () => {
    return Utils.Logging.enterSubunit("Disconnecting from TestApp")
        .then(() => waitForOk(Config.TestAppAddress  + "/_close"))
        .then(() => Utils.Logging.exitSubunit());
}

module.exports.runTest = (testPath, silent) => {
    let promise = silent ? Promise.resolve() : Utils.Logging.enterSubunit("Running test " + testPath + "...");
    return promise
        .then(() => Utils.HTTP.get(Config.TestAppAddress + testPath))
        .then(() => !silent && Utils.Logging.exitSubunit());
}