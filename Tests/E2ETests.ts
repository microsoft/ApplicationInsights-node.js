/// <reference path="../applicationInsights.ts" />

import aiModule = require("../applicationInsights");
import http = require("http");

var mock = require("node-mocks-http");
var ai = require("../ai");
var prefix = "E2E tests - ";

class E2ETests {

    public appInsights;
    private testHelper: TestHelper;

    constructor(testHelper: TestHelper, appInsights) {
        this.testHelper = testHelper;
    }

    public run() {
        this._baseTests();
        this._apiTests();
        this._autoCollectionTests();
    }

    private _getAi(key?: string) {
        // load and configure application insights
        var ai = new aiModule.NodeAppInsights({ instrumentationKey: key });
        return ai;
    }

    /**
     * BVTs
     */
    private _baseTests() {
        var type = prefix + "_baseTests";

        this.testHelper.test(type, "can instantiate", () => {
            var ai = this._getAi();
            return !!ai;
        });
    }

    /**
     * Pulic API tests
     */
    private _apiTests() {
        var type = prefix + "_apiTests";
        var ai = this._getAi();
        var test = (name) => {
            this.testHelper.test(type, "appInsights api - " + name, () => ai[name]() || true);
        };

        test("trackEvent");
        test("trackTrace");
        test("trackRequest");
        test("trackException");
        test("trackMetric");
    }

    /**
     * Telemetry Object tests
     */
    private _autoCollectionTests() {
        var type = prefix + "_autoCollectionTests";

        var ai = this._getAi();
        //ai.trackAllHttpServerRequests();
        //ai.trackAllUncaughtExceptions();

        //// create mock server
        //var server = http.createServer(function (req, res) {
        //    console.log(req, res);
        //    res.end("done");
        //});

        //server.listen(0, '127.0.0.1');

        //// send GET to mock server
        //http.get(server.address().address + ":" + server.address().port, (response) => {

        //    var data = "";
        //    response.on('data', (d) => data += d);
        //    response.on('end', () => console.log(data));
        //});
        //// todo:
    }
}

module.exports = E2ETests;
