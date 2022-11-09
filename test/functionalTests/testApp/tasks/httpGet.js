var https = require("https");
var Config = require("../config");

process.removeAllListeners('warning');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/** Make a HTTP request */
module.exports = (callback) => {
    https.get(Config.EndpointBaseAddress, (resp) => {
        var data = "";
        resp.on("data", (d) => {
            data += d;
        });
        resp.on("end", (d) => {
            callback();
        });
    });
}