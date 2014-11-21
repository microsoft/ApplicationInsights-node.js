/// <reference path="../applicationInsights.ts" />

import aiModule = require("../applicationInsights");
import http = require("http");

var mock = require("node-mocks-http");
var ai = require("../ai");
var prefix = "E2E tests - ";

class E2ETests {
    private _testHelper: TestHelper;
    private _server: http.Server;
    private _onComplete: () => void;

    constructor(testHelper: TestHelper, server: http.Server, onComplete: () => void) {
        this._testHelper = testHelper;
        this._server = server;
        this._onComplete = onComplete;
    }

    public run() {
        this._baseTests();
        this._apiTests();
        this._autoCollectionTests();
    }

    private _getAi(key?: string) {
        // load and configure application insights
        var ai = new aiModule.NodeAppInsights({
            instrumentationKey: key,
            bufferMaxInterval: 0 // disables batching
        });

        return ai;
    }

    /**
     * BVTs
     */
    private _baseTests() {
        var type = prefix + "_baseTests";

        this._testHelper.test(type, "can instantiate", () => {
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
        var test = (name, arg1, arg2?) => {
            this._testHelper.test(type, "appInsights api - " + name, () => ai[name](arg1, arg2) || true);
        };

        test("trackEvent", "e2e test event");
        test("trackTrace", "e2e test trace");
        test("trackException", new Error("e2e test error"));
        test("trackMetric", "e2e test metric", 1);
    }

    /**
     * Telemetry Object tests
     */
    private _autoCollectionTests() {
        var type = prefix + "_autoCollectionTests";

        var ai = this._getAi();
        // validate success in sender
        var Sender = require("../Sender");
        var browserSender = ai.context._sender;
        var onSuccess = (response: string) => this._testHelper.test("sender response - ", response, () => {
            this._testHelper.test(type, "request was accepted", () => JSON.parse(response).itemsAccepted === 1);
            this._onComplete();
            return true;
        });

        // check for errors in sender
        var onError = (error: Error) => this._testHelper.test("sender error - ", error.name + error.message, () => {
            return false
        });

        var sender: Sender = new Sender(browserSender._config, onSuccess, onError);
        browserSender._sender = (payload: string) => sender.send(payload);


        ai.trackAllRequests(this._server);
        //ai.trackAllUncaughtExceptions();

        // add listener to server after adding our handler
        this._server.addListener("request", (req: http.ServerRequest, res: http.ServerResponse) => {
            if (req.url === "/" + encodeURIComponent(type)) {
                res.end(type);
            }
        });

        // send GET to mock server
        http.get("http://" + this._server.address().address + ":" + this._server.address().port + "/" + type, (response) => {

            var data = "";
            response.on('data', (d) => data += d);
            response.on('end', () => console.log(data));
        });
        // todo:
    }
}

module.exports = E2ETests;
