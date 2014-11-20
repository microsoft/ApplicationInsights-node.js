/// <reference path="../applicationInsights.ts" />

import aiModule = require("../applicationInsights");

var mock = require("node-mocks-http");
var util = require('../Util');
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
        this._apiTests();
        this._telemetryTests();
        this._contextTests();
        this._utilTests();
    }

    private _baseTests() {
        var type = "baseTests";
        this.testHelper.test(type, "appInsights exists", () => !!this.appInsights);
        this.testHelper.test(type, "appInsights api - trackEvent", () => typeof this.appInsights.trackEvent === "function");
        this.testHelper.test(type, "appInsights api - trackTrace", () => typeof this.appInsights.trackTrace === "function");
        this.testHelper.test(type, "appInsights api - trackRequest", () => typeof this.appInsights.trackRequest === "function");
        this.testHelper.test(type, "appInsights api - trackException", () => typeof this.appInsights.trackException === "function");
        this.testHelper.test(type, "appInsights api - trackMetric", () => typeof this.appInsights.trackMetric === "function");
    }

    /**
     * Pulic API tests
     */
    private _apiTests() {
        // todo: add tests for all public API methods
        var type = "apiTests";
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

    /**
     * Application Context tests
     */
    private _contextTests() {
        var type = "contextTests";
        this.testHelper.test(type, "application context can be serialized", () => {
            //setup

            var ApplicationContext = require("../Context/ApplicationContext");
            var application = new ApplicationContext('');

            // act
            var serializedComponent = ai.Serializer.serialize(application);
            var expectedSerialization = '{}';

            // verify
            if (!serializedComponent) {
                throw ("application context cannot be serialized");
            }
            if (expectedSerialization != serializedComponent) {
                throw ("application context serialization does not match expected serialization");
            }

            return true;
        });

        this.testHelper.test(type, "device context can be serialized", () => {
            //setup

            var DeviceContext = require("../Context/DeviceContext");
            var headers = {
                'host': 'tempuri.org',
                'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.13) Gecko/20080311 Firefox/2.0.0.13',
            }
            var request = mock.createRequest({
                method: 'GET',
                url: '/test',
                headers: headers,
            });
            var device = new DeviceContext(request);

            // act
            var serialized = ai.Serializer.serialize(device);
            var obj = (<DeviceContext>JSON.parse(serialized));
            // verify

            if (typeof obj.locale != "string") {
                throw ("obj.locale is not a string");
            }
            if (typeof obj.type != "string") {
                throw ("obj.type is not a string");
            }
            if (typeof obj.id != "string") {
                throw ("obj.id is not a string");
            }
            if (typeof obj.os != "string") {
                throw ("obj.os is not a string");
            }

            return true;
        });

        this.testHelper.test(type, "location context can be serialized", () => {
            //setup
            var LocationContext = require("../Context/LocationContext");
            var headers = {
                'host': 'tempuri.org',
                'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.13) Gecko/20080311 Firefox/2.0.0.13',
            }
            var request = mock.createRequest({
                method: 'GET',
                url: '/test',
                headers: headers,
            });
            request.connection = {
                remoteAddress: "test",
            };
            var location = new LocationContext(null);

            var serialized = ai.Serializer.serialize(location);
            var expectedSerialization = '{}';

            if (!serialized) {
                throw ("location context could not be serialized");
            }
            if (serialized != expectedSerialization) {
                throw ("location serialization does not match expected serialiaztion");
            }

            location = new LocationContext(request);
            if (!location.IP) {
                throw ("location context was not correctly initialized");
            }

            return true;
        });

        this.testHelper.test(type, "session context can be serialized", () => {
            //setup
            var SessionContext = require("../Context/SessionContext");
            var session = new SessionContext(null, null);
            session.id = "{guid}";
            // act
            var serializedSession = ai.Serializer.serialize(session);
            var expectedSerialization = '{"id":"{guid}"}';

            // verify
            if (!serializedSession) {
                throw ("sesssion context could not be serialized");
            }
            if (expectedSerialization != serializedSession) {
                throw ("session serialization does not match expected serilization");
            }

            return true;
        });

        this.testHelper.test(type, "user context can be serialized", () => {
            //setup
            var UserContext = require("../Context/UserContext");
            var user = new UserContext(null, null);
            user.id = "{guid}";
            // act
            var serializedUser = ai.Serializer.serialize(user);
            var expectedSerialization = '{"id":"{guid}"}';

            // verify
            if (!serializedUser) {
                throw ("user context could not be serialized");
            }
            if (expectedSerialization != serializedUser) {
                throw ("user serialization does not match expected serilization");
            }

            return true;
        });
    }

    /**
     * Util tests
     */
    private _utilTests() {
        var type = "utilTests";
        this.testHelper.test(type, "Test localDate", () => {
            var date = new Date();
            var outcome = util.localDate(date);
            var failed = false;
            if (outcome.length != 29) {
                failed = true;
            } else {
                var nums = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                var format = [nums, nums, nums, nums, ['-'], nums, nums, ['-'], nums, nums, ['T'], nums, nums, [':'], nums, nums, [':'], nums, nums, ['.'], nums, nums, nums, ['+', '-'], nums, nums, [':'], nums, nums];
                //2014-07-29T06:11:45.000+00:00
                for (var i = 0; i < outcome.length; i++) {
                    if (format[i].indexOf(outcome.charAt(i)) == -1) {
                        failed = true;
                        break;
                    }
                }
            }
            if (failed) {
                throw ("date does not match expected ISO conversion outcome");
            }

            return !failed;
        });

        this.testHelper.test(type, "Test getDuration", () => {

            var startDate = new Date();
            var endDate = new Date(startDate.getMilliseconds() + 1000);
            var outcome = util.getDuration(startDate, endDate);
            var failed = false;
            outcome = outcome.substring(outcome.indexOf(':'), outcome.length);
            if (outcome.length != 10) {
                failed = true;
            } else {
                var nums = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                var format = [[':'], nums, nums, [':'], nums, nums, ['.'], nums, nums, nums];
                //00:00:00.000
                for (var i = 0; i < outcome.length; i++) {
                    if (format[i].indexOf(outcome.charAt(i)) == -1) {
                        failed = true;
                        break;
                    }
                }
            }
            if (failed) {
                throw ("date does not match expected ISO conversion outcome");
            }

            return !failed;
        });

        this.testHelper.test(type, "Test getSessionId", () => {
            //setup
            var headers = {
                'host': 'tempuri.org',
                'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.13) Gecko/20080311 Firefox/2.0.0.13',
            }
            var request = mock.createRequest({
                method: 'GET',
                url: '/test',
                headers: headers,
            });
            request.connection = {
                encrypted: false,
            };
            var response = mock.createResponse();

            var firstId = util.getSessionId(request, response);
            if (!firstId) {
                throw ("Util does not generate sessionId");
            }

            var cookieValue = response._headers["set-cookie"][0];
            request.headers["cookie"] = cookieValue;
            var secondId = util.getSessionId(request, response).substring(1);
            if (firstId != secondId) {
                throw ("SessionId is not kept constant for single user");
            }
            //"ai_session=id:3133fb7a-b92f-4bae-917f-f7d435669edf|acq:2014-07-31T17:15:01.622-07:00|acq:1406852101622; path=/; httponly"
            var accessDate = cookieValue.substring(cookieValue.indexOf('|acq:') + 5, cookieValue.indexOf(';'));
            accessDate = accessDate.substring(accessDate.indexOf('|acq:') + 5, accessDate.length);
            var newDate = parseFloat(accessDate) + 1800000;
            var newValue = cookieValue.substring(0, cookieValue.indexOf(accessDate) - 5);
            request.headers["cookie"] = newValue + '|acq:' + newDate;
            var thirdId = util.getUserId(request, response);
            if (firstId == thirdId) {
                throw ("UserId does not change for different users");
            }

            return true;
        });

        this.testHelper.test(type, "Test getUserId", () => {
            //setup
            var headers = {
                'host': 'tempuri.org',
                'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.13) Gecko/20080311 Firefox/2.0.0.13',
            }
            var request = mock.createRequest({
                method: 'GET',
                url: '/test',
                headers: headers,
            });
            request.connection = {
                encrypted: false,
            };
            var response = mock.createResponse();

            var firstId = util.getUserId(request, response);
            if (!firstId) {
                throw ("Util does not generate userId");
            }

            var cookieValue = response._headers["set-cookie"][0];
            request.headers["cookie"] = cookieValue;
            var secondId = util.getUserId(request, response).substring(1);
            if (firstId != secondId) {
                throw ("UserId is not kept constant for single user");
            }

            request.headers["cookie"] = 'ai_user=id:' + "guid" + '|acq:' + util.localDate(new Date());
            var thirdId = util.getUserId(request, response);
            if (firstId == thirdId) {
                throw ("UserId does not change for different users");
            }

            return true;
        });
    }
}

module.exports = UnitTests;
