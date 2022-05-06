const URL } from 'url');
const http } from 'http');

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
            http.get(urlObj, HTTP._httpResponseHandler(resolve, reject)).on("error", (e) => reject(e));
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
            const req = http.request(urlObj, HTTP._httpResponseHandler(resolve, reject)).on("error", (e) => reject(e));
            req.write(serializedPayload);
            req.end();
        });
    }
}

module.exports.Logger =  class Logger {
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
        console.info(Logger.getInstance()._getNesting() + msg);
    }
    static error(msg) {
        console.error("\x1b[1m\x1b[31m" + Logger.getInstance()._getNesting() + msg + "\x1b[0m");
    }
    static success(msg) {
        console.info("\x1b[1m\x1b[32m" + Logger.getInstance()._getNesting() + msg + "\x1b[0m");
    }
    static enterSubunit(msg) {
        Logger.getInstance().info(msg);
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