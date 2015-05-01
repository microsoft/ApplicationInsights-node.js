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
    var properties:{ [key: string]: string; } = {p1: "p1", p2: "p2"};
    var measurements:{ [key: string]: number; } = {m1: 1, m2: 2};
    var client = new Client("key");
    var trackStub:SinonStub;

    before(() => trackStub = sinon.stub(client, "track"));
    after(() => trackStub.restore());

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
        it("should call trackEvent with event data", () => {
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
        it("should call trackTrace with message data", () => {
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
        it("should call trackException with name/value data", () => {
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
        it("should call trackMetric with name/value data", () => {
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
            var sendStub = sinon.stub(client.channel, "triggerSend");
            client.sendPendingData();
            assert.ok(sendStub.calledOnce);
            sendStub.restore();
        });
    });

    describe("#getEnvelope()", () => {
        it("should assign common properties to the data", () => {

        });

        it("should allow tags to be overwritten", () => {

        });

        it("should set sequence numbers correctly", () => {

        });
    });

    describe("#track()", () => {
        it("should wrap the data in an envelope", () => {

        });

        it("should pass data to the channel", () => {

        });
    });
});