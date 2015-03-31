/// <reference path="UnitTests.ts" />
/// <reference path="E2ETests.ts" />
/// <reference path="../applicationInsights.ts" />

/*
 * To run these tests:
 *  - npm install
 *  - set APPINSIGHTS_INSTRUMENTATION_KEY=<insert_your_instrumentation_key_here>
 *  - node Tests\TestServer.js
 */

import http = require("http");
import url = require("url");

import UnitTests = require("./UnitTests")
import E2ETests = require("./E2ETests")
import TestHelper = require("./TestHelper")

interface ProvidesResults {
    getResults(): string;
    isSuccessfulTestRun?: boolean;
}

interface ErrorWithStack extends Error {
    stack: string;
}

function runTests(server: http.Server, onComplete: (helper: ProvidesResults) => void) {
    // create test helper
    var testHelper: TestHelper = new TestHelper();

    // catch unhandled exceptions and make sure they show up in test results
    var onError = (error: ErrorWithStack) => {
        var type = "unhandled exception - ";
        var name = error.name + error.message;
        onComplete({
            getResults: () => error.name + error.message + "</br>" +
                "<textarea style='width:100%; height:500px;'>" + error.stack + " </textarea > "
        });
    };

    process.on("uncaughtException", onError);

    // run unit tests
    var unitTests: TestHelper.Tests = new UnitTests(testHelper);
    unitTests.register();

    // run e2e tests
    var e2eTests: TestHelper.Tests = new E2ETests(testHelper);
    e2eTests.register();

    testHelper.run(onComplete);
}

// create server
var server = http.createServer();

function browserTestRunner(req: http.ServerRequest, res: http.ServerResponse) {
    if (req.url === "/") {
        runTests(server, results => {
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
        runTests(server, results => {
            if (results.isSuccessfulTestRun) {
                console.log("test pass succeeded.");
                process.exit(0);
            } else {
                console.error(results.getResults())
                throw ("test pass failed.");
                process.exit(-1);
            }
        });
    });
}
