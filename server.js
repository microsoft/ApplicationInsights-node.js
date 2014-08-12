var http = require("http");
var url = require("url");
var port = process.env.port || 1337;
var appInsights = require("applicationInsights");

appInsights.filter("favicon");
http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World\n');
}).listen(port);