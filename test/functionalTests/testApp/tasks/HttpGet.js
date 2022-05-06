var http } from "http");
var URL } from 'url');
var Config } from "../Config");

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