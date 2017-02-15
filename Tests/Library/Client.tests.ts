///<reference path="..\..\typings\globals\node\index.d.ts" />
///<reference path="..\..\typings\globals\mocha\index.d.ts" />
///<reference path="..\..\typings\globals\sinon\index.d.ts" />

import assert = require("assert");
import crypto = require('crypto');
import sinon = require("sinon");
import http = require("http");
import eventEmitter = require('events');

import Client = require("../../Library/Client");
import Config = require("../../Library/Config");
import ContractsModule = require("../../Library/Contracts");
import RequestResponseHeaders = require("../../Library/RequestResponseHeaders");
import Util = require("../../Library/Util")

describe("Library/Client", () => {

    var iKey = "Instrumentation-Key-12345-6789A";
    var name = "name";
    var value = 3;
    var mockData = <any>{ baseData: { properties: {} }, baseType: "BaseTestData" };
    var properties: { [key: string]: string; } = { p1: "p1", p2: "p2", common: "commonArg" };
    var measurements: { [key: string]: number; } = { m1: 1, m2: 2 };
    var client = new Client(iKey);
    var trackStub: Sinon.SinonStub;
    var triggerStub: Sinon.SinonStub;
    var sendStub: Sinon.SinonStub;

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

    afterEach(() => {
        sendStub.reset();
        client.clearTelemetryProcessors();
    })

    var invalidInputHelper = (name: string) => {
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
            var obj0 = args[0][0];
            var obj1 = args[1][0];
            var obj2 = args[2][0];

            assert.equal(obj0.baseData.name, name);
            assert.equal(obj1.baseData.name, name);
            assert.deepEqual(obj1.baseData.properties, properties);
            assert.equal(obj2.baseData.name, name);
            assert.deepEqual(obj2.baseData.properties, properties);
            assert.equal(obj2.baseData.measurements, measurements);
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
            var obj0 = args[0][0];
            var obj1 = args[1][0];
            var obj2 = args[2][0];

            assert.equal(obj0.baseData.message, name);
            assert.equal(obj1.baseData.message, name);
            assert.deepEqual(obj1.baseData.severityLevel, 0);
            assert.equal(obj2.baseData.message, name);
            assert.deepEqual(obj2.baseData.severityLevel, 0);
            assert.equal(obj2.baseData.properties, properties);
        });

        it("should not crash with invalid input", () => {
            invalidInputHelper("trackTrace");
        });
    });

    describe("#trackException()", () => {
        it("should track Exception with correct data - Error only", () => {
            trackStub.reset();
            client.trackException(new Error(name));

            assert.ok(trackStub.calledOnce);

            var args = trackStub.args;
            var obj0 = args[0][0];

            assert.equal(obj0.baseData.exceptions[0].message, name);
        });

        it("should track Exception with correct data - Error and properties", () => {
            trackStub.reset();
            client.trackException(new Error(name), properties);

            assert.ok(trackStub.calledOnce);

            var args = trackStub.args;
            var obj0 = args[0][0];

            assert.equal(obj0.baseData.exceptions[0].message, name);
            assert.deepEqual(obj0.baseData.properties, properties);
        });

        it("should track Exception with correct data - Error, properties and measurements", () => {
            trackStub.reset();
            client.trackException(new Error(name), properties, measurements);

            assert.ok(trackStub.calledOnce);

            var args = trackStub.args;
            var obj0 = args[0][0];

            assert.equal(obj0.baseData.exceptions[0].message, name);
            assert.deepEqual(obj0.baseData.properties, properties);
            assert.deepEqual(obj0.baseData.measurements, measurements);
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

            assert.ok(trackStub.calledTwice);

            var args = trackStub.args;
            var obj0 = args[0][0];
            var obj1 = args[1][0];

            assert.equal(obj0.baseData.metrics[0].name, name);
            assert.equal(obj0.baseData.metrics[0].value, value);

            assert.equal(obj1.baseData.metrics[0].name, name);
            assert.equal(obj1.baseData.metrics[0].value, value);
            assert.equal(obj1.baseData.metrics[0].count, count);
            assert.equal(obj1.baseData.metrics[0].min, min);
            assert.equal(obj1.baseData.metrics[0].max, max);
            assert.equal(obj1.baseData.metrics[0].stdDev, stdev);
            assert.deepEqual(obj1.baseData.properties, properties);
        });

        it("should not crash with invalid input", () => {
            invalidInputHelper("trackMetric");
        });
    });

    describe("request tracking", () => {
        var response = {
            emitFinish: function (): void {
                if (this.finishCallback) {
                    this.finishCallback();
                }
            },
            once: function (event: string, callback: Function): eventEmitter.EventEmitter {
                if (event === 'finish') {
                    this.finishCallback = callback;
                }
                return new eventEmitter.EventEmitter();
            },
            statusCode: 200,
            headers: {},
            getHeader: function (name: string) { return this.headers[name]; },
            setHeader: function (name: string, value: string) { this.headers[name] = value; },
        };

        var request = {
            emitError: function (): void {
                if (this.errorCallback) {
                    var error = {
                        "errorProp": "errorVal"
                    }
                    this.errorCallback(error);
                }
            },
            emitResponse: function (): void {
                if (this.responseCallback) {
                    this.responseCallback(response);
                }
            },
            on: function (event: string, callback: (error: any) => void): void {
                if (event === 'error') {
                    this.errorCallback = callback;
                } else if (event === 'response') {
                    this.responseCallback = callback;
                }
            },
            method: "GET",
            url: "/search?q=test",
            connection: {
                encrypted: false
            },
            agent: {
                protocol: 'http'
            },
            headers: {
                host: "bing.com"
            },
            getHeader: function (name: string) { return this.headers[name]; },
            setHeader: function (name: string, value: string) { this.headers[name] = value; },
        };

        afterEach(() => {
            delete request.headers[RequestResponseHeaders.sourceInstrumentationKeyHeader];
            delete response.headers[RequestResponseHeaders.targetInstrumentationKeyHeader];
            client.config = new Config(iKey);
        });

        function parseDuration(duration: string): number {
            if (!duration) {
                return 0;
            }

            var parts = duration.match("(\\d\\d):(\\d\\d):(\\d\\d).(\\d\\d\\d)");
            return parseInt(parts[1]) * 60 * 60 * 1000 + parseInt(parts[2]) * 60 * 1000 + parseInt(parts[3]) * 1000 + parseInt(parts[4]);
        }

        describe("#trackRequest()", () => {
            var clock: Sinon.SinonFakeTimers;

            before(() => {
                clock = sinon.useFakeTimers();
            });

            after(() => {
                clock.restore();
            });

            it("should not crash with invalid input", () => {
                invalidInputHelper("trackRequest");
            });

            it('should track request with correct data on response finish event ', () => {
                trackStub.reset();
                clock.reset();
                client.trackRequest(<any>request, <any>response, properties);

                // finish event was not emitted yet
                assert.ok(trackStub.notCalled);

                // emit finish event
                clock.tick(10);
                response.emitFinish();
                assert.ok(trackStub.calledOnce);
                var args = trackStub.args;
                var obj0 = args[0][0];

                assert.equal(obj0.baseType, "Microsoft.ApplicationInsights.RequestData");
                assert.equal(obj0.baseData.responseCode, 200);
                assert.deepEqual(obj0.baseData.properties, properties);
                var duration = parseDuration(obj0.baseData.duration);
                assert.equal(duration, 10);
            });

            it('should track request with correct tags on response finish event', () => {
                trackStub.reset();
                clock.reset();
                client.trackRequest(<any>request, <any>response, properties);

                // emit finish event
                response.emitFinish();

                // validate
                var args = trackStub.args;
                var tags = args[0][1];

                assert.equal(tags["ai.operation.name"], "GET /search");
                assert.equal(tags["ai.device.id"], "");
                assert.equal(tags["ai.device.type"], null);
            });

            it('should track request with correct data on request error event', () => {
                trackStub.reset();
                clock.reset();
                client.trackRequest(<any>request, <any>response, properties);

                // finish event was not emitted yet
                assert.ok(trackStub.notCalled);

                // emit finish event
                clock.tick(10);
                request.emitError();
                assert.ok(trackStub.calledOnce);
                var args = trackStub.args;
                var obj0 = args[0][0];

                assert.equal(obj0.baseType, "Microsoft.ApplicationInsights.RequestData");
                assert.equal(obj0.baseData.success, false);
                assert.equal(obj0.baseData.properties['errorProp'], 'errorVal');
                var duration = parseDuration(obj0.baseData.duration);
                assert.equal(duration, 10);
            });

            it('should use source and target ikey headers', () => {
                trackStub.reset();
                clock.reset();

                // Simulate an incoming request that has a different source ikey hash header.
                let testIKey = crypto.createHash('sha256').update('Instrumentation-Key-98765-4321A').digest('base64');
                request.headers[RequestResponseHeaders.sourceInstrumentationKeyHeader] = testIKey;

                client.trackRequest(<any>request, <any>response, properties);

                // finish event was not emitted yet
                assert.ok(trackStub.notCalled);

                // emit finish event
                clock.tick(10);
                response.emitFinish();
                assert.ok(trackStub.calledOnce);
                var args = trackStub.args;
                var obj0 = args[0][0];

                assert.equal(obj0.baseType, "Microsoft.ApplicationInsights.RequestData");
                assert.equal(obj0.baseData.source, testIKey);

                // The client's ikey hash should have been added as the response target ikey header.
                assert.equal(response.headers[RequestResponseHeaders.targetInstrumentationKeyHeader],
                    client.config.instrumentationKeyHash);
            });

            it('should NOT use source and target ikey headers when url is on the excluded list', () => {
                trackStub.reset();
                clock.reset();

                client.config.correlationHeaderExcludedDomains = ["bing.com"];

                // Simulate an incoming request that has a different source ikey hash header.
                let testIKey = crypto.createHash('sha256').update('Instrumentation-Key-98765-4321A').digest('base64');
                request.headers[RequestResponseHeaders.sourceInstrumentationKeyHeader] = testIKey;

                client.trackRequest(<any>request, <any>response, properties);

                // finish event was not emitted yet
                assert.ok(trackStub.notCalled);

                // emit finish event
                clock.tick(10);
                response.emitFinish();
                assert.ok(trackStub.calledOnce);
                var args = trackStub.args;
                var obj0 = args[0][0];

                assert.equal(obj0.baseType, "Microsoft.ApplicationInsights.RequestData");
                assert.equal(response.headers[RequestResponseHeaders.targetInstrumentationKeyHeader], undefined);
            });
        });

        describe("#trackRequestSync()", () => {
            it('should track request with correct data synchronously', () => {
                trackStub.reset();
                client.trackRequestSync(<any>request, <any>response, 100, properties);
                assert.ok(trackStub.calledOnce);
                var args = trackStub.args;
                var obj0 = args[0][0];

                assert.equal(obj0.baseType, "Microsoft.ApplicationInsights.RequestData");
                assert.equal(obj0.baseData.responseCode, 200);
                assert.equal(obj0.baseData.duration, '00:00:00.100');
                assert.deepEqual(obj0.baseData.properties, properties);
            });
        });

        describe("#trackDependencyRequest()", () => {
            var clock: Sinon.SinonFakeTimers;

            before(() => {
                clock = sinon.useFakeTimers();
            });

            after(() => {
                clock.restore();
            });

            it("should not crash with invalid input", () => {
                invalidInputHelper("trackDependencyRequest");
            });

            it('should track request with correct data from request options', () => {
                trackStub.reset();
                clock.reset();
                client.trackDependencyRequest({
                        host: 'bing.com',
                        path: '/search?q=test'
                    },
                    <any>request, properties);

                // response event was not emitted yet
                assert.ok(trackStub.notCalled);

                // emit response event
                clock.tick(10);
                request.emitResponse();
                assert.ok(trackStub.calledOnce);
                var args = trackStub.args;
                var obj0 = args[0][0];

                assert.equal(obj0.baseType, "Microsoft.ApplicationInsights.RemoteDependencyData");
                assert.equal(obj0.baseData.success, true);
                assert.equal(obj0.baseData.duration, "00:00:00.010");
                assert.equal(obj0.baseData.name, "GET /search");
                assert.equal(obj0.baseData.data, "http://bing.com/search?q=test");
                assert.equal(obj0.baseData.target, "bing.com");
                assert.equal(obj0.baseData.type, ContractsModule.Contracts.RemoteDependencyDataConstants.TYPE_HTTP);
                assert.deepEqual(obj0.baseData.properties, properties);
            });

            it('should track request with correct data on response event', () => {
                trackStub.reset();
                clock.reset();
                client.trackDependencyRequest('http://bing.com/search?q=test', <any>request, properties);

                // response event was not emitted yet
                assert.ok(trackStub.notCalled);

                // emit response event
                clock.tick(10);
                request.emitResponse();
                assert.ok(trackStub.calledOnce);
                var args = trackStub.args;
                var obj0 = args[0][0];

                assert.equal(obj0.baseType, "Microsoft.ApplicationInsights.RemoteDependencyData");
                assert.equal(obj0.baseData.success, true);
                assert.equal(obj0.baseData.duration, "00:00:00.010");
                assert.equal(obj0.baseData.name, "GET /search");
                assert.equal(obj0.baseData.data, "http://bing.com/search?q=test");
                assert.equal(obj0.baseData.target, "bing.com");
                assert.equal(obj0.baseData.type, ContractsModule.Contracts.RemoteDependencyDataConstants.TYPE_HTTP);
                assert.deepEqual(obj0.baseData.properties, properties);
            });

            it('should track request with correct data on request error event', () => {
                trackStub.reset();
                clock.reset();
                client.trackDependencyRequest('http://bing.com/search?q=test', <any>request, properties);

                // error event was not emitted yet
                assert.ok(trackStub.notCalled);

                // emit error event
                clock.tick(10);
                request.emitError();
                assert.ok(trackStub.calledOnce);
                var args = trackStub.args;
                var obj0 = args[0][0];

                assert.equal(obj0.baseType, "Microsoft.ApplicationInsights.RemoteDependencyData");
                assert.equal(obj0.baseData.success, false);
                assert.equal(obj0.baseData.duration, "00:00:00.010");
                assert.equal(obj0.baseData.name, "GET /search");
                assert.equal(obj0.baseData.data, "http://bing.com/search?q=test");
                assert.equal(obj0.baseData.target, "bing.com");
                assert.deepEqual(obj0.baseData.properties, properties);
            });

            it('should use source and target ikey headers', () => {
                trackStub.reset();
                clock.reset();
                client.trackDependencyRequest({
                        host: 'bing.com',
                        path: '/search?q=test'
                    },
                    <any>request, properties);

                // The client's ikey hash should have been added as the request source ikey header.
                assert.equal(request.headers[RequestResponseHeaders.sourceInstrumentationKeyHeader],
                    client.config.instrumentationKeyHash);

                // response event was not emitted yet
                assert.ok(trackStub.notCalled);

                // Simulate a response from another service that includes a target ikey hash header.
                response.headers[RequestResponseHeaders.targetInstrumentationKeyHeader] =
                    crypto.createHash('sha256').update('Instrumentation-Key-98765-4321A').digest('base64');;

                // emit response event
                clock.tick(10);
                request.emitResponse();
                assert.ok(trackStub.calledOnce);
                var args = trackStub.args;
                var obj0 = args[0][0];

                assert.equal(obj0.baseData.target, "bing.com | " +
                    response.headers[RequestResponseHeaders.targetInstrumentationKeyHeader]);
                assert.equal(obj0.baseData.type, "ApplicationInsights");
            });

            it('should not set source ikey headers when the host is on a excluded domain list', () => {
                trackStub.reset();
                clock.reset();

                client.config.correlationHeaderExcludedDomains = ["*.domain.com"]
                client.trackDependencyRequest({
                        host: 'excluded.domain.com',
                        path: '/search?q=test'
                    },
                    <any>request, properties);

                // The client's ikey hash should NOT have been added for excluded domains
                assert.equal(request.headers[RequestResponseHeaders.sourceInstrumentationKeyHeader], null);
            });

            it('should not set source ikey headers when the host is on a excluded domain list', () => {
                trackStub.reset();
                clock.reset();

                client.config.correlationHeaderExcludedDomains = ["*.domain.com"]
                client.trackDependencyRequest({
                        host: 'excluded.domain.com',
                        path: '/search?q=test'
                    },
                    <any>request, properties);

                // The client's ikey hash should NOT have been added for excluded domains
                assert.equal(request.headers[RequestResponseHeaders.sourceInstrumentationKeyHeader], null);
            });
        });
    });

    describe("#trackDependency()", () => {
        it("should track RemoteDependency with correct data", () => {
            trackStub.reset();
            var commandName = "http://bing.com/search?q=test";
            var dependencyTypeName = "dependencyTypeName";
            client.trackDependency(name, commandName, value, true, dependencyTypeName, properties);

            assert.ok(trackStub.calledOnce);

            var args = trackStub.args;
            var obj0 = args[0][0];

            assert.equal(obj0.baseType, "RemoteDependencyData");
            assert.equal(obj0.baseData.name, name);
            assert.equal(obj0.baseData.data, commandName);
            assert.equal(obj0.baseData.target, 'bing.com');
            assert.equal(obj0.baseData.duration, Util.msToTimeSpan(value));
            assert.equal(obj0.baseData.success, true);
            assert.equal(obj0.baseData.type, dependencyTypeName);
            assert.deepEqual(obj0.baseData.properties, properties);
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
        var commonproperties: { [key: string]: string } = { common1: "common1", common2: "common2", common: "common" };
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
            var customTag = { "ai.cloud.roleInstance": "override" };
            var expected = {};
            for(var tag in client.context.tags) {
                expected[tag] = customTag[tag] || client.context.tags[tag];
            }
            env = client.getEnvelope(mockData, <any>customTag);
            assert.deepEqual(env.tags, expected)
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
            for (let propertyName in env) {
                indices[propertyName] = index;
                ++index;
            }
            assert.ok(
                Math.max(indices["name"], indices["time"]) <
                Math.min(indices["data"], indices["tags"]), JSON.stringify(env));
        });

        it("should have valid name", function () {
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

        it("telemetry processor can change the envelope", () => {
            trackStub.restore();
            var expectedName = "I was here";

            client.addTelemetryProcessor((env) => {
                env.name = expectedName;
                return true;
            });

            client.track(mockData);

            assert.equal(sendStub.callCount, 1, "send called once");

            var actualData = sendStub.firstCall.args[0] as ContractsModule.Contracts.Envelope;
            assert.equal(actualData.name, expectedName, "envelope name should be changed by the processor");
        });

        it("telemetry processor can access the context object", () => {
            trackStub.restore();
            var expectedName = "I was here";

            client.addTelemetryProcessor((env, contextObjects) => {
                env.name = contextObjects["name"];
                return true;
            });

            client.track(mockData, null, {"name": expectedName});

            assert.equal(sendStub.callCount, 1, "send called once");

            var actualData = sendStub.firstCall.args[0] as ContractsModule.Contracts.Envelope;
            assert.equal(actualData.name, expectedName, "envelope name should be changed by the processor");
        });

        it("telemetry processors are executed in a right order", () => {
            trackStub.restore();

            client.addTelemetryProcessor((env) => {
                env.name = "First";
                return true;
            });

            client.addTelemetryProcessor((env) => {
                env.name += ", Second";
                return true;
            });

            client.addTelemetryProcessor((env) => {
                env.name += ", Third";
                return true;
            });

            client.track(mockData);
            assert.equal(sendStub.callCount, 1, "send called once");

            var actualData = sendStub.firstCall.args[0] as ContractsModule.Contracts.Envelope;
            assert.equal(actualData.name, "First, Second, Third", "processors should executed in the right order");
        });

        it("envelope rejected by the telemetry processor will not be sent", () => {
            trackStub.restore();

            client.addTelemetryProcessor((env) => {
                return false;
            });

            client.track(mockData);

            assert.ok(sendStub.notCalled, "send should not be called");
        });

        it("envelope is rejected when processor throws exception", () => {
            trackStub.restore();

            client.addTelemetryProcessor((env): boolean => {
                throw "telemetry processor failed";
            });

            client.track(mockData);

            assert.ok(sendStub.notCalled, "send should not be called");
        });
    });

    describe("#addTelemetryProcessor()", () => {
        it("adds telemetry processor to the queue", () => {
            trackStub.restore();
            var processorExecuted = false;

            client.addTelemetryProcessor((env) => {
                processorExecuted = true;
                return true;
            });

            client.track(mockData);

            assert.ok(processorExecuted, "telemetry processor should be executed");
        });
    });

    describe("#clearTelemetryProcessors()", () => {
        it("removes all processors from the telemetry processors list", () => {
            trackStub.restore();
            var processorExecuted = false;

            client.addTelemetryProcessor((env) => {
                processorExecuted = true;
                return true;
            });

            client.clearTelemetryProcessors();
            client.track(mockData);

            assert.ok(!processorExecuted, "telemetry processor should NOT be executed");
        });
    });
});
