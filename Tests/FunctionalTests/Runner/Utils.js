const URL = require('url');
const http = require('http');

module.exports.HTTP = class HTTP {
    /** @param {string} url */
    static _parseUrl(url) {
        const parsed = URL.parse(url);
        return {
            host: parsed.hostname,
            port: parsed.port,
            path: parsed.pathname
        };
    }
    /** @param {function(string)} resolve
     *  @param {function(Error)} reject
     */
    static _httpResponseHandler(resolve, reject) {
        return (res) => {
            let responseText = "";
            res.on("data", (d) => responseText += d);
            res.on("end", () => {
                resolve(responseText);
            });
            res.on("error", (e) => {
                reject(e);
            });
        };
    }
    /** @param {string} url
     *  @param {function(string, Error)} callback
     */
    static get(url) {
        return new Promise((resolve, reject) => {
            const urlObj = HTTP._parseUrl(url);
            const req = http.get(urlObj, HTTP._httpResponseHandler(resolve, reject));
            
            // Add timeout handling - longer timeout for database tests
            const isDatabaseTest = url.includes("Postgres") || url.includes("MySql") || url.includes("Mongo");
            let timeout;
            
            if (process.env.CI || process.env.GITHUB_ACTIONS) {
                timeout = isDatabaseTest ? 30000 : 15000; // 30s for DB tests, 15s for others in CI
            } else {
                timeout = isDatabaseTest ? 60000 : 30000; // 60s for DB tests, 30s for others locally
            }
            
            req.setTimeout(timeout, () => {
                req.abort();
                reject(new Error(`Request timeout for ${url} after ${timeout}ms`));
            });
            
            req.on("error", (e) => reject(e));
        });
    }
    /** @param {string} url
     *  @param {object} payload
     */
    static post(url, payload) {
        const serializedPayload = JSON.stringify(payload);
        const urlObj = HTTP._parseUrl(url);
        urlObj.method = "POST";
        urlObj.headers = {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Length": Buffer.byteLength(serializedPayload)
        };
        return new Promise((resolve, reject) => {
            const req = http.request(urlObj, HTTP._httpResponseHandler(resolve, reject));
            
            // Add timeout handling - shorter timeout for CI
            const timeout = (process.env.CI || process.env.GITHUB_ACTIONS) ? 15000 : 30000;
            req.setTimeout(timeout, () => {
                req.abort();
                reject(new Error(`Request timeout for ${url} after ${timeout}ms`));
            });
            
            req.on("error", (e) => reject(e));
            req.write(serializedPayload);
            req.end();
        });
    }
}

module.exports.Logging =  class Logging {
    static _getNesting() {
        let msgPrefix = "";
        if (this.nesting) {
            for(let i = 0; i < this.nesting; i++) {
                msgPrefix += "  ";
            }
            msgPrefix += "- ";
        }
        return msgPrefix;
    }
    static info(msg) {
        console.info(Logging._getNesting() + msg);
    }
    static error(msg) {
        console.error("\x1b[1m\x1b[31m" + Logging._getNesting() + msg + "\x1b[0m");
    }
    static success(msg) {
        console.info("\x1b[1m\x1b[32m" + Logging._getNesting() + msg + "\x1b[0m");
    }
    static enterSubunit(msg) {
        Logging.info(msg);
        if (!this.nesting) {
            this.nesting = 0;
        }
        this.nesting++;
        return Promise.resolve();
    }
    static exitSubunit() {
        if (this.nesting) {
            this.nesting--;
        }
        return Promise.resolve();
    }
};