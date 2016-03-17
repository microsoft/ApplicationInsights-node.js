///<reference path="..\..\Declarations\node\node.d.ts" />
///<reference path="..\..\Declarations\mocha\mocha.d.ts" />
///<reference path="..\..\Declarations\sinon\sinon.d.ts" />

import assert = require("assert");
import sinon = require("sinon");
import http = require("http");

import Client = require("../../Library/Client");
import ContractsModule = require("../../Library/Contracts");

describe("Library/Client", () => {

    var name = "name";
    var value = 3;
    var mockData = <any>{baseData: {properties: {}}, baseType: "BaseTestData"};
    var properties:{ [key: string]: string; } = {p1: "p1", p2: "p2", common: "commonArg"};
    var measurements:{ [key: string]: number; } = {m1: 1, m2: 2};
    var client = new Client("Instrumentation-Key-12345-6789A");
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
            var count = 1;
            var min = 0;
            var max = 0;
            var stdev = 0;
            client.trackMetric(name, value);
            client.trackMetric(name, value, count, min, max, stdev, properties);

            assert.ok(trackStub.calledOnce);

            var args = trackStub.args;
            assert.equal(args[0][0].baseData.metrics[0].name, name);
            assert.equal(args[0][0].baseData.metrics[0].value, value);
            
            assert.equal(args[1][0].baseData.metrics[0].name, name);
            assert.equal(args[1][0].baseData.metrics[0].value, value);
            assert.equal(args[1][0].baseData.metrics[0].count, count);
            assert.equal(args[1][0].baseData.metrics[0].min, min);
            assert.equal(args[1][0].baseData.metrics[0].max, max);
            assert.equal(args[1][0].baseData.metrics[0].stdev, stdev);
            assert.deepEqual(args[1][0].baseData.metrics[0].properties, properties);
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

    describe("#trackDependency()", () => {
        it("should track RemoteDependency with correct data", () => {
            trackStub.reset();
            var commandName = "commandName";
            var dependencyTypeName = "dependencyTypeName";
            client.trackDependency(name, commandName, value, true, dependencyTypeName, properties);

            assert.ok(trackStub.calledOnce);

            var args = trackStub.args;
            assert.equal(args[0][0].baseType, "RemoteDependencyData");
            assert.equal(args[0][0].baseData.name, name);
	    assert.equal(args[0][0].baseData.commandName, commandName);
            assert.equal(args[0][0].baseData.value, value);
            assert.equal(args[0][0].baseData.success, true);
            assert.equal(args[0][0].baseData.dependencyTypeName, dependencyTypeName);
            assert.deepEqual(args[0][0].baseData.properties, properties);

            // default values
            assert.deepEqual(args[0][0].baseData.dependencyKind, ContractsModule.Contracts.DependencyKind.Other);
            assert.equal(args[0][0].baseData.async, false);
            assert.deepEqual(args[0][0].baseData.dependencySource, ContractsModule.Contracts.DependencySourceType.Undefined);
        });
    });

    describe("#sendPendingData()", () => {
        it("should invoke the sender", () => {
            triggerStub.reset();
            client.sendPendingData();
            assert.ok(triggerStub.calledOnce);
        });

        it("should accept a callback", () => {
            triggerStub.reset();
            var callback = sinon.spy();
            client.sendPendingData(callback);
            assert.strictEqual(triggerStub.firstCall.args[0], false);
            assert.strictEqual(triggerStub.firstCall.args[1], callback);
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
            var seq1 = Client.parseSeq(env1.seq);
            assert.equal(seq1[0].length, 22);
            var seq2 = Client.parseSeq(env2.seq);
            assert.equal(seq2[0].length, 22);
            assert.ok(seq1[1] < seq2[1]);
            assert.equal(seq1[1] + 1, seq2[1]);
        });

        it("should write properties in a specific order", () => {
            let env = client.getEnvelope(mockData);
            let keys = Object.keys(env);
            let indices: { [name: string]: number } = {};
            let index = 0;
            for(let propertyName in env) {
                indices[propertyName] = index;
                ++index;
            }
            assert.ok(
                Math.max(indices["name"], indices["time"]) <
                Math.min(indices["data"], indices["tags"]));
        });

        it("should have valid name", function() {
            let envelope = client.getEnvelope(mockData);
            assert.equal(envelope.name, "Microsoft.ApplicationInsights.InstrumentationKey123456789A.BaseTest");
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
            let seq = Client.parseSeq(expected.seq);
            expected.seq = seq[0] + ":" + (seq[1] + 1).toString();
            expected.time = actual.time;

            assert.deepEqual(actual, expected);
        });
    });
});
