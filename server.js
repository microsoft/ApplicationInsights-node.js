var http = require("http");
var url = require("url");
var port = process.env.port || 1337;

// load and configure application insights
var appInsights = require("applicationInsights");
appInsights.filter("favicon");

// run tests
var unitTests = require('./Tests/UnitTests');
unitTests.run();

// start browser and listen for requests
http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World\n');
}).listen(port);