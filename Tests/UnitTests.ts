/// <reference path="../applicationInsights.ts" />
/// <reference path="TestRunner.ts" />

module UnitTests {
    var ai = require("applicationInsights");
    var Serializer = require("./TestSerializer").Serializer;
    var testRunner = require("./TestRunner");
    var Util = require("../Util");
    var context = require("../node_modules/applicationinsights/ai").context;

    // todo: find a way to include this without packaging
    //var mock = require("node-mocks-http");

    export function run() {

        testRunner.test("ai exists", () => !!ai);
        testRunner.test("Serializer exists", () => !!Serializer);
        testRunner.test("Util exists", () => !!Util);
        testRunner.test("context exists", () => !!context);

        ///**
        //* Pulic API tests
        //* Total: 3
        //*/
        //testRunner.test("trackRequest can be invoked", () => {
        //    ai.trackRequest(null, null);
        //});

        //testRunner.test("filter can be invoked", () => {
        //    ai.filter("test");
        //});

        //testRunner.test("trackException can be invoked", () => {
        //    ai.trackException(new Error());
        //});


        ///**
        //* Telemetry Object tests
        //* Total: 7
        //*/
        //testRunner.test("Contexts are initiliazed in node, not by TelelmetryContext constructor", () => {
        //    if (context.device) {
        //        throw ("DeviceContext was initialized by TelemetryContext");
        //    }
        //    if (context.application) {
        //        throw ("ApplicationContext was initialized by TelemetryContext");
        //    }
        //    if (context.location) {
        //        throw ("LocationContext was initialized by TelemetryContext");
        //    }
        //    if (context.session) {
        //        throw ("SessionContext was initialized by TelemetryContext");
        //    }
        //    if (context.user) {
        //        throw ("UserContext was initialized by TelemetryContext");
        //    }
        //});

        //testRunner.test("Empty contexts not included in serialization of RequestTelemetry", () => {
        //    var RequestTelemetry = require("../Node/ai").RequestTelemetry;
        //    var request = new RequestTelemetry;

        //    //act
        //    var serializedComponent = Serializer.serialize(request);
        //    var obj = (JSON.parse(serializedComponent));

        //    //verify
        //    if (typeof obj.ver != "number") {
        //        throw ("obj.ver is not a string");
        //    }
        //    if (typeof obj.name != "string") {
        //        throw ("obj.name is not a string");
        //    }
        //    if (typeof obj.time != "string") {
        //        throw ("obj.time is not a string");
        //    }
        //    if (obj.device || obj.application || obj.location || obj.operation || obj.session || obj.user) {
        //        throw ("request serialized unintialized context");
        //    }
        //    if (!serializedComponent) {
        //        throw ("request could not be serialized");
        //    }
        //});

        //testRunner.test("Request data is serialized", () => {
        //    var RequestData = require("../Node/ai").RequestData;
        //    var data = new RequestData();
        //    data.properties = {};

        //    // act
        //    var serializedComponent = Serializer.serialize(data);
        //    var expectedSerialization = '{"ver":1,"name":"","properties":{}}';

        //    // verify
        //    if (!serializedComponent) {
        //        throw ("Request data cannot be serialized");
        //    }
        //    if (expectedSerialization != serializedComponent) {
        //        throw ("request data serialization does not match expected serialization");
        //    }

        //});

        ///**
        //* Exception Telemetry tests
        //* Total:
        //*/
        //var ExceptionTelemetry = require("../Node/ai").ExceptionTelemetry;
        //var exception = new ExceptionTelemetry([new Error()]);

        //testRunner.test("ExceptionTelemetry can be serialized", () => {

        //    var serializedComponent = Serializer.serialize(exception);
        //    if (!serializedComponent) {
        //        throw ("exception coould not be serialized");
        //    }
        //});

        //testRunner.test("trackException does not initialize Node contexts", () => {
        //    if (exception.device || exception.application || exception.location || exception.operation || exception.session || exception.user) {
        //        throw ("exception intialized invalid context");
        //    }
        //});

        //testRunner.test("trackException initializes ExceptionData", () => {

        //    if (!exception.data || !exception.data.item) {
        //        throw ("exception.data not initialized");
        //    }
        //    var data = exception.data.item;
        //    if (typeof data.handledAt != "string") {
        //        throw ("exception.data.handledAt is not a string");
        //    }
        //    if (!data.exceptions || data.exceptions == []) {
        //        throw ("exceptions not initialized");
        //    }
        //    var exceptions = data.exceptions;
        //    if (typeof exceptions[0].typeName != "string") {
        //        throw ("exceptions.typename is not a string");
        //    }
        //    if (typeof exceptions[0].message != "string") {
        //        throw ("exception.message is not a string");
        //    }
        //});

        ///**
        //* Application Context tests
        //* Total: 2
        //*/
        //testRunner.test("application context can be serialized", () => {
        //    //setup

        //    var ApplicationContext = require("../Node/Context/ApplicationContext");
        //    var application = new ApplicationContext('');

        //    // act
        //    var serializedComponent = Serializer.serialize(application);
        //    var expectedSerialization = '{}';

        //    // verify
        //    if (!serializedComponent) {
        //        throw ("application context cannot be serialized");
        //    }
        //    if (expectedSerialization != serializedComponent) {
        //        throw ("application context serialization does not match expected serialization");
        //    }
        //});

        ///**
        //* Device Context tests
        //* Total: 4
        //*/
        //testRunner.test("device context can be serialized", () => {
        //    //setup

        //    var DeviceContext = require("../Node/Context/DeviceContext");
        //    var headers = {
        //        'host': 'tempuri.org',
        //        'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.13) Gecko/20080311 Firefox/2.0.0.13',
        //    }
        //    var request = mock.createRequest({
        //        method: 'GET',
        //        url: '/test',
        //        headers: headers,
        //    });
        //    var device = new DeviceContext(request);

        //    // act
        //    var serialized = Serializer.serialize(device);
        //    var obj = (<DeviceContext>JSON.parse(serialized));
        //    // verify

        //    if (typeof obj.locale != "string") {
        //        throw ("obj.locale is not a string");
        //    }
        //    if (typeof obj.type != "string") {
        //        throw ("obj.type is not a string");
        //    }
        //    if (typeof obj.id != "string") {
        //        throw ("obj.id is not a string");
        //    }
        //    if (typeof obj.os != "string") {
        //        throw ("obj.os is not a string");
        //    }
        //});

        ///**
        //* Location Context tests
        //* Total: 3
        //*/
        //testRunner.test("location context can be serialized", () => {
        //    //setup

        //    var LocationContext = require("../Node/Context/LocationContext");
        //    var headers = {
        //        'host': 'tempuri.org',
        //        'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.13) Gecko/20080311 Firefox/2.0.0.13',
        //    }
        //    var request = mock.createRequest({
        //        method: 'GET',
        //        url: '/test',
        //        headers: headers,
        //    });
        //    request.connection = {
        //        remoteAddress: "test",
        //    };
        //    var location = new LocationContext(null);

        //    var serialized = Serializer.serialize(location);
        //    var expectedSerialization = '{}';

        //    if (!serialized) {
        //        throw ("location context could not be serialized");
        //    }
        //    if (serialized != expectedSerialization) {
        //        throw ("location serialization does not match expected serialiaztion");
        //    }

        //    location = new LocationContext(request);
        //    if (!location.IP) {
        //        throw ("location context was not correctly initialized");
        //    }
        //});

        ///**
        //* Session Context tests
        //* Total: 2
        //*/
        //testRunner.test("session context can be serialized", () => {
        //    //setup
        //    var SessionContext = require("../Node/Context/SessionContext");
        //    var session = new SessionContext(null, null);
        //    session.id = "{guid}";
        //    // act
        //    var serializedSession = Serializer.serialize(session);
        //    var expectedSerialization = '{"id":"{guid}"}';

        //    // verify
        //    if (!serializedSession) {
        //        throw ("sesssion context could not be serialized");
        //    }
        //    if (expectedSerialization != serializedSession) {
        //        throw ("session serialization does not match expected serilization");
        //    }
        //});

        ///**
        //* User Context tests
        //* Total: 2
        //*/
        //testRunner.test("user context can be serialized", () => {
        //    //setup
        //    var UserContext = require("../Node/Context/UserContext");
        //    var user = new UserContext(null, null);
        //    user.id = "{guid}";
        //    // act
        //    var serializedUser = Serializer.serialize(user);
        //    var expectedSerialization = '{"id":"{guid}"}';

        //    // verify
        //    if (!serializedUser) {
        //        throw ("user context could not be serialized");
        //    }
        //    if (expectedSerialization != serializedUser) {
        //        throw ("user serialization does not match expected serilization");
        //    }
        //});

        ///**
        //* Util tests
        //* Total: 8
        //*/
        //testRunner.test("Test localDate", () => {
        //    var date = new Date();
        //    var outcome = Util.localDate(date);
        //    var failed = false;
        //    if (outcome.length != 29) {
        //        failed = true;
        //    } else {
        //        var nums = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        //        var format = [nums, nums, nums, nums, ['-'], nums, nums, ['-'], nums, nums, ['T'], nums, nums, [':'], nums, nums, [':'], nums, nums, ['.'], nums, nums, nums, ['+', '-'], nums, nums, [':'], nums, nums];
        //        //2014-07-29T06:11:45.000+00:00
        //        for (var i = 0; i < outcome.length; i++) {
        //            if (format[i].indexOf(outcome.charAt(i)) == -1) {
        //                failed = true;
        //                break;
        //            }
        //        }
        //    }
        //    if (failed) {
        //        throw ("date does not match expected ISO conversion outcome");
        //    }
        //});

        //testRunner.test("Test getDuration", () => {

        //    var startDate = new Date();
        //    var endDate = new Date(startDate.getMilliseconds() + 1000);
        //    var outcome = Util.getDuration(startDate, endDate);
        //    var failed = false;
        //    outcome = outcome.substring(outcome.indexOf(':'), outcome.length);
        //    if (outcome.length != 10) {
        //        failed = true;
        //    } else {
        //        var nums = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        //        var format = [[':'], nums, nums, [':'], nums, nums, ['.'], nums, nums, nums];
        //        //00:00:00.000
        //        for (var i = 0; i < outcome.length; i++) {
        //            if (format[i].indexOf(outcome.charAt(i)) == -1) {
        //                failed = true;
        //                break;
        //            }
        //        }
        //    }
        //    if (failed) {
        //        throw ("date does not match expected ISO conversion outcome");
        //    }
        //});

        //testRunner.test("Test getSessionId", () => {
        //    //setup
        //    var headers = {
        //        'host': 'tempuri.org',
        //        'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.13) Gecko/20080311 Firefox/2.0.0.13',
        //    }
        //    var request = mock.createRequest({
        //        method: 'GET',
        //        url: '/test',
        //        headers: headers,
        //    });
        //    request.connection = {
        //        encrypted: false,
        //    };
        //    var response = mock.createResponse();

        //    var firstId = Util.getSessionId(request, response);
        //    if (!firstId) {
        //        throw ("Util does not generate sessionId");
        //    }

        //    var cookieValue = response.getHeader("Set-Cookie")[0];
        //    request.headers["cookie"] = cookieValue;
        //    var secondId = Util.getSessionId(request, response).substring(1);
        //    if (firstId != secondId) {
        //        throw ("SessionId is not kept constant for single user");
        //    }
        //    //"ai_session=id:3133fb7a-b92f-4bae-917f-f7d435669edf|acq:2014-07-31T17:15:01.622-07:00|acq:1406852101622; path=/; httponly"
        //    var accessDate = cookieValue.substring(cookieValue.indexOf('|acq:') + 5, cookieValue.indexOf(';'));
        //    accessDate = accessDate.substring(accessDate.indexOf('|acq:') + 5, accessDate.length);
        //    var newDate = parseFloat(accessDate) + 1800000;
        //    var newValue = cookieValue.substring(0, cookieValue.indexOf(accessDate) - 5);
        //    request.headers["cookie"] = newValue + '|acq:' + newDate;
        //    var thirdId = Util.getUserId(request, response);
        //    if (firstId == thirdId) {
        //        throw ("UserId does not change for different users");
        //    }
        //});

        //testRunner.test("Test getUserId", () => {
        //    //setup
        //    var headers = {
        //        'host': 'tempuri.org',
        //        'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.13) Gecko/20080311 Firefox/2.0.0.13',
        //    }
        //    var request = mock.createRequest({
        //        method: 'GET',
        //        url: '/test',
        //        headers: headers,
        //    });
        //    request.connection = {
        //        encrypted: false,
        //    };
        //    var response = mock.createResponse();

        //    var firstId = Util.getUserId(request, response);
        //    if (!firstId) {
        //        throw ("Util does not generate userId");
        //    }

        //    var cookieValue = response.getHeader("Set-Cookie")[0];
        //    request.headers["cookie"] = cookieValue;
        //    var secondId = Util.getUserId(request, response).substring(1);
        //    if (firstId != secondId) {
        //        throw ("UserId is not kept constant for single user");
        //    }

        //    request.headers["cookie"] = 'ai_user=id:' + "guid" + '|acq:' + Util.localDate(new Date());
        //    var thirdId = Util.getUserId(request, response);
        //    if (firstId == thirdId) {
        //        throw ("UserId does not change for different users");
        //    }
        //});
    }
}

module.exports = UnitTests;
