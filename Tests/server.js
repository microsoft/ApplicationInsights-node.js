var http = require("http");
var url = require("url");
var port = process.env.port;

// load and configure application insights
var appInsights = require("../applicationInsights");
//appInsights.filter("favicon");

//var unitTests = require( './UnitTests' );

//// start browser and listen for requests
//if (port) {
//    http.createServer(function(req, res) {

//        // re-run tests on each request
//        var testPass = unitTests.run();
//        res.writeHead(200, { 'Content-Type': 'text/html' });
//        res.end(testPass.results);
//    }).listen(port);
//} else {
//    // exit if this was called by the build script with no port set
//    console.log("running tests:");
//    var testPass = unitTests.run();
//    if (testPass.isSuccess) {
//        console.log("test pass succeeded.");
//        process.exit(code = 0);
//    } else {
//        throw("test pass failed.");
//        process.exit(code = -1);
//    }
//}