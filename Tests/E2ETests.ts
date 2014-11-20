/// <reference path="../applicationInsights.ts" />

import aiModule = require("../applicationInsights");

var mock = require("node-mocks-http");
var util = require('../Util');
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
        // todo:
    }
}

module.exports = E2ETests;
