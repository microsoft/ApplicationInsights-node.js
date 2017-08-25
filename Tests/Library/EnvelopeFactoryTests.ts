import assert = require("assert");
import sinon = require("sinon");
import http = require("http");

import EnvelopeFactory = require("../../Library/EnvelopeFactory");
import ExceptionTelemetry = require("../../Library/ExceptionTelemetry");
import Contracts = require("../../Declarations/Contracts")
import Client = require("../../Library/Client")
import EventTelemetry = require("../../Library/EventTelemetry")

describe("Library/EnvelopeFactory", () => {
        
    var properties: { [key: string]: string; } = { p1: "p1", p2: "p2", common: "commonArg" };
    var mockData = <any>{ baseData: { properties: {} }, baseType: "BaseTestData" };
    describe("#getEnvelope()", () => {
        var commonproperties: { [key: string]: string } = { common1: "common1", common2: "common2", common: "common" };
        it("should assign common properties to the data", () => {
            var client1 = new Client("key");
            client1.commonProperties = commonproperties;
            client1.config.samplingPercentage = 99;
            mockData.baseData.properties = JSON.parse(JSON.stringify(properties));
            var env = EnvelopeFactory.createEnvelope(<EventTelemetry>{name:"name"}, Contracts.DataTypes.EVENT, commonproperties, client1.context, client1.config);

            // check sample rate
            assert.equal(env.sampleRate, client1.config.samplingPercentage);

            // check common properties
            assert.equal(env.data.baseData.properties.common1, (<any>commonproperties).common1);
            assert.equal(env.data.baseData.properties.common2, (<any>commonproperties).common2);

            // check argument properties
            assert.equal(env.data.baseData.properties.p1, (<any>properties).p1);
            assert.equal(env.data.baseData.properties.p2, (<any>properties).p2);

            // check that argument properties overwrite common properties1
            assert.equal(env.data.baseData.properties.common, (<any>properties).common);
        });

        it("should allow tags to be overwritten", () => {
            mockData.properties = {};
            var env = client.getEnvelope(mockData);
            assert.deepEqual(env.tags, client.context.tags, "tags are set by default");
            var customTag = <{ [id: string]: string }>{ "ai.cloud.roleInstance": "override" };
            var expected: { [id: string]: string } = {};
            for (var tag in client.context.tags) {
                expected[tag] = customTag[tag] || client.context.tags[tag];
            }
            env = client.getEnvelope(mockData, <any>customTag);
            assert.deepEqual(env.tags, expected)
        });

        it("should have valid name", function () {
            let envelope = client.getEnvelope(mockData);
            assert.equal(envelope.name, "Microsoft.ApplicationInsights.InstrumentationKey123456789A.BaseTest");
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

            var envelope = EnvelopeFactory.createEnvelope(<ExceptionTelemetry>{ exception: simpleError }, Contracts.DataTypes.EXCEPTION);
            var exceptionData = <Contracts.Data<Contracts.ExceptionData>>envelope.data;
            var actual = exceptionData.baseData.exceptions[0].parsedStack[0].method;
            var expected = "<no_method>";

            assert.deepEqual(actual, expected);
        });

        it("fills empty 'method' with '<no_filename>'", () => {
            simpleError.stack = "  at Context.<anonymous> (\t:12:34)\n" + simpleError.stack;

            var envelope = EnvelopeFactory.createEnvelope(<ExceptionTelemetry>{ exception: simpleError }, Contracts.DataTypes.EXCEPTION);
            var exceptionData = <Contracts.Data<Contracts.ExceptionData>>envelope.data;

            var actual = exceptionData.baseData.exceptions[0].parsedStack[0].fileName;
            var expected = "<no_filename>";

            assert.deepEqual(actual, expected);
        });
    });
});
