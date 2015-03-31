import AppInsights = require("../applicationInsights");
import ai = require("../ai");
import TestHelper = require("./TestHelper")

var mock = require("node-mocks-http");

class UnitTests implements TestHelper.Tests  {

    public appInsights: AppInsights;
    private testHelper: TestHelper;

    constructor(testHelper: TestHelper) {
        // load and configure application insights
        
        this.appInsights = new AppInsights({ instrumentationKey: "fakeTestKey" });
        this.testHelper = testHelper;
    }

    public register() {
        this._baseTests();
        this._APITests();
        this._telemetryTests();
        this._exceptionTests();
    }

    private _baseTests() {
        var type = "baseTests";
        var self = this;
        this.testHelper.registerTest(type, "appInsights exists", () => !!self.appInsights);
        this.testHelper.registerTest(type, "appInsights API - NodeAppInsights", () => typeof AppInsights.NodeAppInsights === "function");
        this.testHelper.registerTest(type, "appInsights API - trackEvent", () => typeof self.appInsights.trackEvent === "function");
        this.testHelper.registerTest(type, "appInsights API - trackTrace", () => typeof self.appInsights.trackTrace === "function");
        this.testHelper.registerTest(type, "appInsights API - trackRequest", () => typeof self.appInsights.trackRequest === "function");
        this.testHelper.registerTest(type, "appInsights API - trackException", () => typeof self.appInsights.trackException === "function");
        this.testHelper.registerTest(type, "appInsights API - trackMetric", () => typeof self.appInsights.trackMetric === "function");
    }

    /**
     * Pulic API tests
     */
    private _APITests() {
        var type = "APITests";
        var self = this;

        var test = (name: string, action: () => void) => {
            this.testHelper.registerTest(type, name, () => {
                action();
                return true;
            });
        };

        test("trackRequest can be invoked", () => self.appInsights.trackRequest(null, null));
        test("trackException can be invoked", () => self.appInsights.trackException(new Error()));
        test("trackEvent can be invoked", () => self.appInsights.trackEvent("event"));
        test("trackMetric can be invoked", () => self.appInsights.trackMetric("metric", 0));
        test("trackTrace can be invoked", () => self.appInsights.trackTrace("trace"));
        test("startStopTrackEvent can be invoked", () => {
            self.appInsights.startTrackEvent("startStopTrackEvent");
            self.appInsights.stopTrackEvent("startStopTrackEvent");
        });
    }

    /**
     * Telemetry Object tests
     */
    private _telemetryTests() {
        var type = "telemetryTests";
        var self = this;
        this.testHelper.registerTest(type, "Contexts are initiliazed", () => {
            if (!self.appInsights.context) {
                throw ("Telemetry context is not defined");
            }

            return true;
        });

        this.testHelper.registerTest(type, "Empty contexts not included in serialization of RequestTelemetry", () => {
            var request: Microsoft.ApplicationInsights.Telemetry.Request;
            request = new ai.Telemetry.Request("name", +new Date, 10, 200, true);
            request.iKey = "testKey";

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
        this.testHelper.registerTest(type, "trackException initializes ExceptionData", () => {
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

export = UnitTests;
