/// <reference path="UnitTests.ts" />
/// <reference path="../applicationInsights.ts" />

var http = require("http");
var url = require("url");

// load and configure application insights
var aiModule = require("../applicationInsights");
var appInsights = new aiModule({ instrumentationKey: "fakeTestKey" });

function runTests() {
    var UnitTests = require('./UnitTests');
    var TestHelper = require("./TestHelper");
    var testHelper = new TestHelper();
    var unitTests: UnitTests = new UnitTests(testHelper, appInsights);
    unitTests.run();

    return testHelper;
}

// start browser and listen for requests
if (process.env.port) {
    // re-run tests on each request/refresh
    http.createServer(function(req, res) {
        var testPass = runTests();
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(testPass.results);
    }).listen(process.env.port);
} else {
    // exit if this was called by the build script with no port set
    console.log("running tests:");
    var testPass = runTests();
    if (testPass.isSuccess) {
        console.log("test pass succeeded.");
        process.exit(0);
    } else {
        throw("test pass failed.");
        process.exit(-1);
    }
}