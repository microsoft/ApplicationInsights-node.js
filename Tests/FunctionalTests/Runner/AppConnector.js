var Config = require("./Config");
var Utils = require("./Utils");

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
        if (!ok && (tries || 0) < 60) { // Increased from 20 to 60 retries
            Utils.Logging.info("Waiting for TestApp...");
            return new Promise( (resolve, reject)=> {
                setTimeout(() => resolve(waitForOk(url, (tries || 0) + 1)), 2000); // Increased from 500ms to 2000ms
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
        .then(() => {
            const startTime = Date.now();
            
            // Increase timeout for database tests
            const isDatabaseTest = testPath.includes("Postgres") || testPath.includes("MySql") || testPath.includes("Mongo");
            const retryAttempts = isDatabaseTest ? 3 : 1;
            
            const attemptRequest = (attempt = 1) => {
                return Utils.HTTP.get(Config.TestAppAddress + testPath).then(result => {
                    const elapsed = Date.now() - startTime;
                    if (!silent) {
                        Utils.Logging.info(`Test completed in ${elapsed}ms`);
                    }
                    return result;
                }).catch(error => {
                    const elapsed = Date.now() - startTime;
                    
                    if (attempt < retryAttempts && error.message.includes("timeout")) {
                        Utils.Logging.info(`Test ${testPath} timed out on attempt ${attempt}, retrying...`);
                        return new Promise(resolve => {
                            setTimeout(() => resolve(attemptRequest(attempt + 1)), 2000);
                        });
                    }
                    
                    Utils.Logging.error(`Test ${testPath} failed after ${elapsed}ms on attempt ${attempt}/${retryAttempts}: ${error.message}`);
                    throw error;
                });
            };
            
            return attemptRequest();
        })
        .then(() => !silent && Utils.Logging.exitSubunit());
}