/// <reference path="UnitTests.ts" />
/// <reference path="E2ETests.ts" />
/// <reference path="../applicationInsights.ts" />

/*
 * To run these tests:
 *  - npm install node-mocks-http
 *  - npm install async
 *  - set APPINSIGHTS_INSTRUMENTATION_KEY=<insert_your_instrumentation_key_here>
 *  - node Tests\TestServer.js
 */

import http = require("http");
import url = require("url");

function runTests(server: http.Server, onComplete: (TestHelper) => void) {
    // create test helper
    var TestHelper = require("./TestHelper");
    var testHelper: TestHelper = new TestHelper();

    // catch unhandled exceptions and make sure they show up in test results
    var onError = (error: Error) => {
        var type = "unhandled exception - ";
        var name = error.name + error.message;
        onComplete({
            getResults: () => error.name + error.message + "</br>" +
                "<textarea style='width:100%; height:500px;'>" + error["stack"] + " </textarea > "
        });
    };

    process.on("uncaughtException", onError);

    // run unit tests
    var UnitTests = require('./UnitTests');
    var unitTests: Tests = new UnitTests(testHelper);
    unitTests.register();

    // run e2e tests
    var E2ETests = require('./E2ETests');
    var e2eTests: Tests = new E2ETests(testHelper);
    e2eTests.register();

    testHelper.run(onComplete);
}

// create server
var server = http.createServer();

function browserTestRunner(req: http.ServerRequest, res: http.ServerResponse) {
    if (req.url === "/") {
        runTests(server, (results: TestHelper) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(results.getResults());
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
        runTests(server, (results: TestHelper) => {
            if (results.isSuccessfulTestRun) {
                console.log("test pass succeeded.");
                process.exit(0);
            } else {
                throw ("test pass failed.");
                process.exit(-1);
            }
        });
    });
}
