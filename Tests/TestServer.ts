/// <reference path="UnitTests.ts" />
/// <reference path="E2ETests.ts" />
/// <reference path="../applicationInsights.ts" />

/*
 * To run these tests:
 *  - npm install node-mocks-http
 *  - set APPINSIGHTS_INSTRUMENTATION_KEY=<insert_your_instrumentation_key_here>
 *  - node Tests\TestServer.js
 */

import http = require("http");
import url = require("url");

function runTests(server: http.Server, onComplete: () => void) {
    // create test helper
    var TestHelper = require("./TestHelper");
    var testHelper: TestHelper = new TestHelper();

    // catch unhandled exceptions and make sure they show up in test results
    var onError = (error: Error) => {
        testHelper.test("unhandled exception - ", error.name + error.message, () => false);
        onComplete();
        throw error;
    };

    process.on("uncaughtException", onError);

    // run unit tests
    var UnitTests = require('./UnitTests');
    var unitTests = new UnitTests(testHelper);
    unitTests.run();

    // run e2e tests
    var E2ETests = require('./E2ETests');
    var e2eTests = new E2ETests(testHelper, server, onComplete);

    try {
        e2eTests.run();
    } catch (e) {
        // catch error if environment variable APPINSIGHTS_INSTRUMENTATION_KEY is not set to a valid key
        testHelper.test("error running E2E tests", e.name + e.message, () => false);
        onComplete();
    }

    return testHelper;
}

// create server
var server = http.createServer();

function browserTestRunner(req: http.ServerRequest, res: http.ServerResponse) {
    if (req.url === "/") {
        var testPass = runTests(server, () => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(testPass.results);
        });
    }
}

if (process.env.port) {

    // re-run tests on each request/refresh
    server.listen(process.env.port, "localhost");
    server.addListener("request", browserTestRunner);
} else {

    // emit test results to console if no port was specified
    server.listen(0, '127.0.0.1');
    server.on("listening", () => {
        console.log("running tests:");
        var testPass = runTests(server, () => {
            if (testPass.isSuccessfulTestRun) {
                console.log("test pass succeeded.");
                process.exit(0);
            } else {
                throw ("test pass failed.");
                process.exit(-1);
            }
        });
    });
}
