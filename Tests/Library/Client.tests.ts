///<reference path="..\..\Declarations\node\node.d.ts" />
///<reference path="..\..\Declarations\mocha\mocha.d.ts" />
///<reference path="..\..\Declarations\sinon\sinon.d.ts" />

import assert = require("assert");
import sinon = require("sinon");
import http = require("http");

import Client = require("../../Library/Client");

describe("Library/Client", () => {

    var name = "name";
    var value = 3;
    var mockData = <any>{baseData: {properties: {}}, baseType: "BaseTestData"};
    var properties:{ [key: string]: string; } = {p1: "p1", p2: "p2", common: "commonArg"};
    var measurements:{ [key: string]: number; } = {m1: 1, m2: 2};
    var client = new Client("key");
    var trackStub:SinonStub;
    var triggerStub:SinonStub;
    var sendStub:SinonStub;

    before(() => {
        trackStub = sinon.stub(client, "track");
        triggerStub = sinon.stub(client.channel, "triggerSend");
        sendStub = sinon.stub(client.channel, "send");
    });
    after(() => {
        trackStub.restore();
        triggerStub.restore();
        sendStub.restore();
    });

    var invalidInputHelper = (name:string) => {
        assert.doesNotThrow(() => client[name](null, null));
        assert.doesNotThrow(() => client[name](<any>undefined, <any>undefined));
        assert.doesNotThrow(() => client[name](<any>{}, <any>{}));
        assert.doesNotThrow(() => client[name](<any>[], <any>[]));
        assert.doesNotThrow(() => client[name](<any>"", <any>""));
        assert.doesNotThrow(() => client[name](<any>1, <any>1));
        assert.doesNotThrow(() => client[name](<any>true, <any>true));
    };

    describe("#constructor()", () => {
        it("should initialize config", () => {
            var client = new Client("key");
            assert.ok(client.config);
            assert.ok(client.config.instrumentationKey);
        });

        it("should initialize context", () => {
            var client = new Client("key");
            assert.ok(client.context);
            assert.ok(client.context.tags);
        });

        it("should initialize common properties", () => {
            var client = new Client("key");
            assert.ok(client.commonProperties);
        });

        it("should initialize channel", () => {
            var client = new Client("key");
            assert.ok(client.channel);
        });
    });

    describe("#trackEvent()", () => {
        it("should track Event with correct data", () => {
            trackStub.reset();
            client.trackEvent(name);
            client.trackEvent(name, properties);
            client.trackEvent(name, properties, measurements);

            assert.ok(trackStub.calledThrice);

            var args = trackStub.args;
            assert.equal(args[0][0].baseData.name, name);
            assert.equal(args[1][0].baseData.name, name);
            assert.deepEqual(args[1][0].baseData.properties, properties);
            assert.equal(args[2][0].baseData.name, name);
            assert.deepEqual(args[2][0].baseData.properties, properties);
            assert.equal(args[2][0].baseData.measurements, measurements);
        });

        it("should not crash with invalid input", () => {
            invalidInputHelper("trackEvent");
        });
    });

    describe("#trackTrace()", () => {
        it("should track Trace with correct data", () => {
            trackStub.reset();
            client.trackTrace(name);
            client.trackTrace(name, 0);
            client.trackTrace(name, 0, properties);

            assert.ok(trackStub.calledThrice);

            var args = trackStub.args;
            assert.equal(args[0][0].baseData.message, name);
            assert.equal(args[1][0].baseData.message, name);
            assert.deepEqual(args[1][0].baseData.severityLevel, 0);
            assert.equal(args[2][0].baseData.message, name);
            assert.deepEqual(args[2][0].baseData.severityLevel, 0);
            assert.equal(args[2][0].baseData.properties, properties);
        });

        it("should not crash with invalid input", () => {
            invalidInputHelper("trackTrace");
        });
    });

    describe("#trackException()", () => {
        it("should track Exception with correct data", () => {
            trackStub.reset();
            client.trackException(new Error(name));
            client.trackException(new Error(name), properties);

            assert.ok(trackStub.calledTwice);

            var args = trackStub.args;
            assert.equal(args[0][0].baseData.exceptions[0].message, name);
            assert.equal(args[1][0].baseData.exceptions[0].message, name);
            assert.deepEqual(args[1][0].baseData.properties, properties);
        });

        it("should not crash with invalid input", () => {
            invalidInputHelper("trackException");
        });
    });

    describe("#trackMetric()", () => {
        it("should track Metric with correct data", () => {
            trackStub.reset();
            client.trackMetric(name, value);

            assert.ok(trackStub.calledOnce);

            var args = trackStub.args;
            assert.equal(args[0][0].baseData.metrics[0].name, name);
            assert.equal(args[0][0].baseData.metrics[0].value, value);
        });

        it("should not crash with invalid input", () => {
            invalidInputHelper("trackMetric");
        });
    });

    describe("#trackRequest()", () => {
        it("should not crash with invalid input", () => {
            invalidInputHelper("trackRequest");
        });
    });

    describe("#sendPendingData()", () => {
        it("should invoke the sender", () => {
            triggerStub.reset();
            client.sendPendingData();
            assert.ok(triggerStub.calledOnce);
        });
    });

    describe("#getEnvelope()", () => {
        var commonproperties:{[key: string]: string} = {common1: "common1", common2: "common2", common: "common"};
        it("should assign common properties to the data", () => {
            var client1 = new Client("key");
            client1.commonProperties = commonproperties;
            mockData.baseData.properties = JSON.parse(JSON.stringify(properties));
            var env = client1.getEnvelope(mockData);

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
            var customTag = {custom: "tag"};
            env = client.getEnvelope(mockData, <any>customTag);
            assert.deepEqual(env.tags, customTag)
        });

        it("should set sequence numbers correctly", () => {
            var env1 = client.getEnvelope(mockData);
            var env2 = client.getEnvelope(mockData);
            var seq1 = parseInt(env1.seq);
            var seq2 = parseInt(env2.seq);
            assert.ok(seq1 < seq2);
            assert.equal(seq1 + 1, seq2);
        });
    });

    describe("#track()", () => {
        it("should pass data to the channel", () => {
            sendStub.reset();

            trackStub.restore();
            client.track(mockData);
            trackStub = sinon.stub(client, "track");

            assert.ok(sendStub.calledOnce);
        });

        it("should wrap the data in an envelope", () => {
            sendStub.reset();
            var expected = client.getEnvelope(mockData);

            trackStub.restore();
            client.track(mockData);
            trackStub = sinon.stub(client, "track");

            var actual = sendStub.firstCall.args[0];

            // make sequence numbers and timestamp equal to leverage deepEqual
            expected.seq = (parseInt(expected.seq) + 1).toString();
            expected.time = actual.time;

            assert.deepEqual(actual, expected);
        });
    });
});