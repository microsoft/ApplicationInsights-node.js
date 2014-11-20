/// <reference path="UnitTests.ts" />
/// <reference path="E2ETests.ts" />
/// <reference path="../applicationInsights.ts" />

/*
 * To run these tests:
 *  - npm install node-mocks-http
 *  - set APPINSIGHTS_INSTRUMENTATION_KEY=<insert_your_instrumentation_key_here>
 *  - node Tests\TestServer.js
 */

var http = require("http");
var url = require("url");

function runTests() {
    var TestHelper = require("./TestHelper");
    var testHelper: TestHelper = new TestHelper();

    var UnitTests = require('./UnitTests');
    var unitTests = new UnitTests(testHelper);
    unitTests.run();

    var E2ETests = require('./E2ETests');
    var e2eTests = new E2ETests(testHelper);

    try {
        e2eTests.run();
    } catch (e) {
        // catch error if environment variable APPINSIGHTS_INSTRUMENTATION_KEY is not set to a valid key
        testHelper.test("test server error", "running E2E tests", () => false);
    }

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
    if (testPass.isSuccessfulTestRun) {
        console.log("test pass succeeded.");
        process.exit(0);
    } else {
        throw("test pass failed.");
        process.exit(-1);
    }
}