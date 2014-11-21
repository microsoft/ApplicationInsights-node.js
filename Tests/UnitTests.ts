/// <reference path="../applicationInsights.ts" />

import aiModule = require("../applicationInsights");

var mock = require("node-mocks-http");
var ai = require("../ai");

class UnitTests {

    public appInsights;
    private testHelper: TestHelper;

    constructor(testHelper: TestHelper, appInsights) {
        // load and configure application insights
        
        this.appInsights = new aiModule.NodeAppInsights({ instrumentationKey: "fakeTestKey" });
        this.testHelper = testHelper;
    }

    public run() {
        this._baseTests();
        this._APITests();
        this._telemetryTests();
    }

    private _baseTests() {
        var type = "baseTests";
        this.testHelper.test(type, "appInsights exists", () => !!this.appInsights);
        this.testHelper.test(type, "appInsights API - trackEvent", () => typeof this.appInsights.trackEvent === "function");
        this.testHelper.test(type, "appInsights API - trackTrace", () => typeof this.appInsights.trackTrace === "function");
        this.testHelper.test(type, "appInsights API - trackRequest", () => typeof this.appInsights.trackRequest === "function");
        this.testHelper.test(type, "appInsights API - trackException", () => typeof this.appInsights.trackException === "function");
        this.testHelper.test(type, "appInsights API - trackMetric", () => typeof this.appInsights.trackMetric === "function");
    }

    /**
     * Pulic API tests
     */
    private _APITests() {
        // todo: add tests for all public API methods
        var type = "APITests";
        this.testHelper.test(type, "trackRequest can be invoked", () => {
            this.appInsights.trackRequest(null, null);
            return true;
        });

        this.testHelper.test(type, "trackException can be invoked", () => {
            this.appInsights.trackException(new Error());
            return true;
        });

        this.testHelper.test(type, "trackException can be invoked", () => {
            this.appInsights.trackException(new Error());
            return true;
        });

        // todo: add more tests to verify things were pulled in from browser version
        this.testHelper.test(type, "trackTrace can be invoked", () => {
            this.appInsights.trackTrace("trace");
            return true;
        });
    }

    /**
     * Telemetry Object tests
     */
    private _telemetryTests() {
        var type = "telemetryTests";
        this.testHelper.test(type, "Contexts are initiliazed", () => {
            if (!this.appInsights.context) {
                throw ("Telemetry context is not defined");
            }

            return true;
        });

        this.testHelper.test(type, "Empty contexts not included in serialization of RequestTelemetry", () => {
            var request: Microsoft.ApplicationInsights.Telemetry.Request;
            request = new ai.Telemetry.Request("name", +new Date, 10, 200, true);

            //act
            var serializedComponent = ai.Serializer.serialize(request);
            var obj = (JSON.parse(serializedComponent));

            //verify
            if (typeof obj.ver != "number") {
                throw ("obj.ver is not a string");
            }
            if (typeof obj.name != "string") {
                throw ("obj.name is not a string");
            }
            if (typeof obj.time != "string") {
                throw ("obj.time is not a string");
            }
            if (obj.device || obj.application || obj.location || obj.operation || obj.session || obj.user) {
                throw ("request serialized unintialized context");
            }
            if (!serializedComponent) {
                throw ("request could not be serialized");
            }

            return true;
        });
    }

    /**
     * Exception Telemetry tests
     */
    private _exceptionTests() {
        var type = "exceptionTests";
        this.testHelper.test(type, "trackException initializes ExceptionData", () => {
            var exception: Microsoft.ApplicationInsights.Telemetry.Request;
            exception = new ai.Telemetry.Exception(new Error());

            if (!exception.data || !exception.data.item) {
                throw ("exception.data not initialized");
            }
            var data = <any>exception.data.item;
            if (typeof data.handledAt != "string") {
                throw ("exception.data.handledAt is not a string");
            }
            if (!data.exceptions || data.exceptions == []) {
                throw ("exceptions not initialized");
            }
            var exceptions = data.exceptions;
            if (typeof exceptions[0].typeName != "string") {
                throw ("exceptions.typename is not a string");
            }
            if (typeof exceptions[0].message != "string") {
                throw ("exception.message is not a string");
            }

            return true;
        });
    }
}

module.exports = UnitTests;
