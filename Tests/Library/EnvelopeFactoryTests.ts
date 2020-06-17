import assert = require("assert");
import sinon = require("sinon");
import http = require("http");

import EnvelopeFactory = require("../../Library/EnvelopeFactory");
import Contracts = require("../../Declarations/Contracts");
import Client = require("../../Library/TelemetryClient");
import Util = require("../../Library/Util");

describe("Library/EnvelopeFactory", () => {

    var properties: { [key: string]: string; } = { p1: "p1", p2: "p2", common: "commonArg" };
    var mockData = <any>{ baseData: { properties: {} }, baseType: "BaseTestData" };
    describe("#createEnvelope()", () => {
        var commonproperties: { [key: string]: string } = { common1: "common1", common2: "common2", common: "common" };
        it("should assign common properties to the data", () => {
            var client1 = new Client("key");
            client1.commonProperties = commonproperties;
            client1.config.samplingPercentage = 99;
            var eventTelemetry = <Contracts.EventTelemetry>{name:"name"};
            eventTelemetry.properties  = properties;
            var env = EnvelopeFactory.createEnvelope(eventTelemetry, Contracts.TelemetryType.Event, commonproperties, client1.context, client1.config);

            // check sample rate
            assert.equal(env.sampleRate, client1.config.samplingPercentage);

            var envData:Contracts.Data<Contracts.EventData> = <Contracts.Data<Contracts.EventData>> env.data;

            // check common properties
            assert.equal(envData.baseData.properties.common1, (<any>commonproperties).common1);
            assert.equal(envData.baseData.properties.common2, (<any>commonproperties).common2);

            // check argument properties
            assert.equal(envData.baseData.properties.p1, (<any>properties).p1);
            assert.equal(envData.baseData.properties.p2, (<any>properties).p2);

            // check that argument properties overwrite common properties1
            assert.equal(envData.baseData.properties.common, (<any>properties).common);
        });

        it("should allow tags to be overwritten", () => {

            var client = new Client("key");
            var env = EnvelopeFactory.createEnvelope(<Contracts.EventTelemetry>{name:"name"}, Contracts.TelemetryType.Event, commonproperties, client.context, client.config);
            assert.deepEqual(env.tags, client.context.tags, "tags are set by default");
            var customTag = <{ [id: string]: string }>{ "ai.cloud.roleInstance": "override" };
            var expected: { [id: string]: string } = {};
            for (var tag in client.context.tags) {
                expected[tag] = customTag[tag] || client.context.tags[tag];
            }
            env = EnvelopeFactory.createEnvelope(<Contracts.EventTelemetry>{name:"name", tagOverrides:customTag}, Contracts.TelemetryType.Event, commonproperties, client.context, client.config);
            assert.deepEqual(env.tags, expected)
        });

        it("should have valid name", function () {
            var client = new Client("key");
            var envelope = EnvelopeFactory.createEnvelope(<Contracts.EventTelemetry>{name:"name"}, Contracts.TelemetryType.Event, commonproperties, client.context, client.config);
            assert.equal(envelope.name, "Microsoft.ApplicationInsights.key.Event");
        });
    });

    describe("#createDependencyData()", () => {
        it("should accept a telemetry item without a name", () => {
            assert.doesNotThrow(() => {
                var envelope = EnvelopeFactory.createEnvelope(<Contracts.DependencyTelemetry>{
                    name: null,
                    data: "GET https://example.com",
                    duration: 123,
                    success: true,
                    resultCode: 200
                }, Contracts.TelemetryType.Dependency);
                assert.equal((envelope.data as Contracts.Data<Contracts.RemoteDependencyData>).baseData.name, undefined);
            });
        });
    });

    describe("#createExceptionData()", () => {
        var simpleError: Error;

        beforeEach(() => {
            try {
                throw Error("simple error");
            } catch (e) {
                simpleError = e;
            }
        });

        it("fills empty 'method' with '<no_method>'", () => {
            simpleError.stack = "  at \t (/path/file.js:12:34)\n" + simpleError.stack;

            var envelope = EnvelopeFactory.createEnvelope(<Contracts.ExceptionTelemetry>{ exception: simpleError }, Contracts.TelemetryType.Exception);
            var exceptionData = <Contracts.Data<Contracts.ExceptionData>>envelope.data;
            var actual = exceptionData.baseData.exceptions[0].parsedStack[0].method;
            var expected = "<no_method>";

            assert.deepEqual(actual, expected);
        });

        it("fills empty 'method' with '<no_filename>'", () => {
            simpleError.stack = "  at Context.<anonymous> (\t:12:34)\n" + simpleError.stack;

            var envelope = EnvelopeFactory.createEnvelope(<Contracts.ExceptionTelemetry>{ exception: simpleError }, Contracts.TelemetryType.Exception);
            var exceptionData = <Contracts.Data<Contracts.ExceptionData>>envelope.data;

            var actual = exceptionData.baseData.exceptions[0].parsedStack[0].fileName;
            var expected = "<no_filename>";

            assert.deepEqual(actual, expected);
        });

        it("fills 'severityLevel' with Error when not specified", () => {
            var envelope = EnvelopeFactory.createEnvelope(<Contracts.ExceptionTelemetry>{ exception: simpleError }, Contracts.TelemetryType.Exception);
            var exceptionData = <Contracts.Data<Contracts.ExceptionData>>envelope.data;

            var actual = exceptionData.baseData.severityLevel;
            var expected = Contracts.SeverityLevel.Error;

            assert.deepEqual(actual, expected);
        });

        it("fills 'severityLevel' with the given value when specified", () => {
            var envelope = EnvelopeFactory.createEnvelope(<Contracts.ExceptionTelemetry>{ exception: simpleError, severity: Contracts.SeverityLevel.Warning }, Contracts.TelemetryType.Exception);
            var exceptionData = <Contracts.Data<Contracts.ExceptionData>>envelope.data;

            var actual = exceptionData.baseData.severityLevel;
            var expected = Contracts.SeverityLevel.Warning;

            assert.deepEqual(actual, expected);
        });
    });

    describe("AvailabilityData", () => {
        let availabilityTelemetry: Contracts.AvailabilityTelemetry;
        beforeEach(() => {
            availabilityTelemetry  = {
                success : true,
                duration: 100,
                measurements: { "m1" : 1},
                runLocation: "west us",
                properties: {
                    "prop1" : "prop1 value"
                },
                message: "availability test message",
                name: "availability test name",
                id: "availability test id",
            };
        });

        it("creates when id not set", () => {
            availabilityTelemetry.id = undefined;

            var envelope = EnvelopeFactory.createEnvelope(availabilityTelemetry, Contracts.TelemetryType.Availability);
            var data =  <Contracts.Data<Contracts.AvailabilityData>>envelope.data;
            assert.ok(data.baseData.id != null);
        });

        it("creates data with given content", () => {
            var envelope = EnvelopeFactory.createEnvelope(availabilityTelemetry, Contracts.TelemetryType.Availability);
            var data =  <Contracts.Data<Contracts.AvailabilityData>>envelope.data;

            assert.deepEqual(data.baseType, "AvailabilityData");

            assert.deepEqual(data.baseData.id, availabilityTelemetry.id);
            assert.deepEqual(data.baseData.measurements, availabilityTelemetry.measurements);
            assert.deepEqual(data.baseData.success, availabilityTelemetry.success);
            assert.deepEqual(data.baseData.runLocation, availabilityTelemetry.runLocation);
            assert.deepEqual(data.baseData.name, availabilityTelemetry.name);
            assert.deepEqual(data.baseData.properties, availabilityTelemetry.properties);
            assert.deepEqual(data.baseData.duration, Util.msToTimeSpan(availabilityTelemetry.duration));

        });
    });

    describe("PageViewData", () => {
        let pageViewTelemetry: Contracts.PageViewTelemetry;
        beforeEach(() => {
            pageViewTelemetry  = {
                duration: 100,
                measurements: { "m1" : 1},
                properties: {
                    "prop1" : "prop1 value"
                },
                url: "https://www.test.com",
                name: "availability test name",
            };
        });

        it("creates data with given content", () => {
            var envelope = EnvelopeFactory.createEnvelope(pageViewTelemetry, Contracts.TelemetryType.PageView);
            var data =  <Contracts.Data<Contracts.PageViewData>>envelope.data;

            assert.deepEqual(data.baseType, "PageViewData");

            assert.deepEqual(data.baseData.url, pageViewTelemetry.url);
            assert.deepEqual(data.baseData.measurements, pageViewTelemetry.measurements);
            assert.deepEqual(data.baseData.name, pageViewTelemetry.name);
            assert.deepEqual(data.baseData.properties, pageViewTelemetry.properties);
            assert.deepEqual(data.baseData.duration, Util.msToTimeSpan(pageViewTelemetry.duration));

        });
    });
});
