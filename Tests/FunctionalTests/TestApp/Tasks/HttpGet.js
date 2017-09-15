var http = require("http");
var URL = require('url');
var Config = require("../Config");

/** Make a HTTP request */
module.exports = (callback) => {
    var url = URL.parse(Config.EndpointBaseAddress);
    http.get({host: url.hostname, path: "/", port: url.port}, (resp) => {
        var data = "";
        resp.on("data", (d) => {
            data += d;
        });
        resp.on("end", (d) => {
            callback();
        });
    });
}