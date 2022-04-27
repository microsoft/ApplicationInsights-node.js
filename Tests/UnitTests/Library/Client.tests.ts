// import * as assert from "assert";
// import * as  https from "https";
// import * as sinon from "sinon";
// import * as   eventEmitter from 'events';

// import { AutoCollectPreAggregatedMetrics } from "../../../AutoCollection/PreAggregatedMetrics";
// import { TelemetryClient } from "../../../library";
// import { Config } from "../../../Library/configuration";
// import * as  Contracts from "../../../Declarations/Contracts";
// import { RequestHeaders } from "../../../Declarations/RequestResponseHeaders";
// import { Util } from "../../../Library/Util";
// import { EnvelopeFactory } from "../../../Library/EnvelopeFactory";

// describe("library", () => {

//     Util.tlsRestrictedAgent = new https.Agent();

//     var iKey = "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
//     var appId = "Application-Key-12345-6789A";
//     var name = "name";
//     var value = 3;
//     var testEventTelemetry = <Contracts.EventTelemetry>{ name: "testEvent" };
//     var properties: { [key: string]: string; } = {
//         p1: "p1", p2: "p2", common: "commonArg"
//     };
//     const requestExpectedProperties = {
//         ...properties,
//         "_MS.ProcessedByMetricExtractors": "(Name:'Requests', Ver:'1.1')",
//     }
//     const dependencyExpectedProperties = {
//         ...properties,
//         "_MS.ProcessedByMetricExtractors": "(Name:'Dependencies', Ver:'1.1')",
//     }
//     const exceptionExpectedProperties = {
//         ...properties,
//         "_MS.ProcessedByMetricExtractors": "(Name:'Exceptions', Ver:'1.1')",
//     }
//     const traceExpectedProperties = {
//         "_MS.ProcessedByMetricExtractors": "(Name:'Traces', Ver:'1.1')",
//     }
//     var failedProperties: { [key: string]: string; } = {
//         p1: "p1", p2: "p2", common: "commonArg", errorProp: "errorVal"
//     };
//     var measurements: { [key: string]: number; } = { m1: 1, m2: 2 };
//     var client = new TelemetryClient(iKey);
//     client.config.correlationId = `cid-v1:${appId}`;
//     var trackStub: sinon.SinonStub;
//     var triggerStub: sinon.SinonStub;
//     var sendStub: sinon.SinonStub;
//     var saveOnCrashStub: sinon.SinonStub;

//     before(() => {
//         trackStub = sinon.stub(client, "track");
//         triggerStub = sinon.stub(client.channel, "triggerSend");
//         sendStub = sinon.stub(client.channel, "send");
//         saveOnCrashStub = sinon.stub(client.channel._sender, "saveOnCrash");
//     });
//     after(() => {
//         trackStub.restore();
//         triggerStub.restore();
//         sendStub.restore();
//         saveOnCrashStub.restore();

//     });

//     afterEach(() => {
//         sendStub.reset();
//         client.clearTelemetryProcessors();
//         saveOnCrashStub.reset();
//     })

//     var invalidInputHelper = (name: string) => {
//         assert.doesNotThrow(() => (<any>client)[name](null, null), "#1");
//         assert.doesNotThrow(() => (<any>client)[name](<any>undefined, <any>undefined), "#2");
//         assert.doesNotThrow(() => (<any>client)[name](<any>{}, <any>{}), "#3");
//         assert.doesNotThrow(() => (<any>client)[name](<any>[], <any>[]), "#4");
//         assert.doesNotThrow(() => (<any>client)[name](<any>"", <any>""), "#5");
//         assert.doesNotThrow(() => (<any>client)[name](<any>1, <any>1), "#6");
//         assert.doesNotThrow(() => (<any>client)[name](<any>true, <any>true), "#7");
//     };

//     describe("#constructor()", () => {
//         it("should initialize config", () => {
//             var client = new TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
//             assert.ok(client.config);
//             assert.ok(client.config.instrumentationKey);
//         });

//         it("should initialize context", () => {
//             var client = new TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
//             assert.ok(client.context);
//             assert.ok(client.context.tags);
//         });

//         it("should initialize common properties", () => {
//             var client = new TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
//             assert.ok(client.commonProperties);
//         });

//         it("should initialize channel", () => {
//             var client = new TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
//             assert.ok(client.channel);
//         });

//         it("should initialize authorization handler", () => {
//             var client = new TelemetryClient("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;");
//             client.config.aadTokenCredential = {
//                 async getToken(scopes: string | string[], options?: any): Promise<any> {
//                     return { token: "testToken", };
//                 }
//             };
//             assert.ok(client.getAuthorizationHandler(client.config));
//         });
//     });

//     describe("#trackEvent()", () => {
//         it("should track Event with correct data", () => {
//             trackStub.reset();
//             client.trackEvent({ name: name });
//             client.trackEvent({ name: name, properties });
//             client.trackEvent({ name: name, properties, measurements });

//             assert.ok(trackStub.calledThrice);

//             var eventTelemetry1 = <Contracts.EventTelemetry>trackStub.firstCall.args[0];
//             var eventTelemetry2 = <Contracts.EventTelemetry>trackStub.secondCall.args[0];
//             var eventTelemetry3 = <Contracts.EventTelemetry>trackStub.thirdCall.args[0];

//             assert.equal(eventTelemetry1.name, name);
//             assert.equal(eventTelemetry2.name, name);
//             assert.deepEqual(eventTelemetry2.properties, properties);
//             assert.equal(eventTelemetry3.name, name);
//             assert.deepEqual(eventTelemetry3.properties, properties);
//             assert.equal(eventTelemetry3.measurements, measurements);
//         });

//         it("should not crash with invalid input", () => {
//             invalidInputHelper("trackEvent");
//         });
//     });

//     describe("#trackPageView()", () => {
//         it("should track Page View with correct data", () => {
//             trackStub.reset();
//             client.trackPageView({ name: name });
//             client.trackPageView({ name: name, properties, measurements });
//             client.trackPageView({ name: name, url: "https://www.test.com", duration: 100 });

//             assert.ok(trackStub.calledThrice);

//             var eventTelemetry1 = <Contracts.PageViewTelemetry>trackStub.firstCall.args[0];
//             var eventTelemetry2 = <Contracts.PageViewTelemetry>trackStub.secondCall.args[0];
//             var eventTelemetry3 = <Contracts.PageViewTelemetry>trackStub.thirdCall.args[0];

//             assert.equal(eventTelemetry1.name, name);
//             assert.equal(eventTelemetry2.name, name);
//             assert.deepEqual(eventTelemetry2.properties, properties);
//             assert.deepEqual(eventTelemetry2.measurements, measurements);
//             assert.equal(eventTelemetry3.name, name);
//             assert.equal(eventTelemetry3.url, "https://www.test.com");
//             assert.equal(eventTelemetry3.duration, 100);
//         });

//         it("should not crash with invalid input", () => {
//             invalidInputHelper("trackPageView");
//         });
//     });

//     describe("#trackTrace()", () => {
//         it("should track Trace with correct data", () => {
//             trackStub.reset();
//             client.trackTrace({ message: name });
//             client.trackTrace({ message: name, severity: 0 });
//             client.trackTrace({ message: name, severity: 0, properties: properties });

//             assert.ok(trackStub.calledThrice);

//             var traceTelemetry1 = <Contracts.TraceTelemetry>trackStub.firstCall.args[0];
//             var traceTelemetry2 = <Contracts.TraceTelemetry>trackStub.secondCall.args[0];
//             var traceTelemetry3 = <Contracts.TraceTelemetry>trackStub.thirdCall.args[0];

//             assert.equal(traceTelemetry1.message, name);
//             assert.equal(traceTelemetry2.message, name);
//             assert.deepEqual(traceTelemetry2.severity, 0);
//             assert.equal(traceTelemetry3.message, name);
//             assert.deepEqual(traceTelemetry3.severity, 0);
//             assert.equal(traceTelemetry3.properties, properties);
//         });

//         it("should not crash with invalid input", () => {
//             invalidInputHelper("trackTrace");
//         });
//     });

//     describe("#trackAvailability()", () => {
//         it("should track availability with correct data", () => {
//             trackStub.reset();
//             const expectedTelemetryData: Contracts.AvailabilityTelemetry = {
//                 duration: 100, id: "id1", message: "message1", success: true, name: "name1", runLocation: "east us"
//             };

//             client.trackAvailability(expectedTelemetryData);

//             assert.ok(trackStub.calledOnce);

//             const availabilityTelemetry = <Contracts.AvailabilityTelemetry>trackStub.firstCall.args[0];

//             assert.equal(availabilityTelemetry.message, expectedTelemetryData.message);
//             assert.equal(availabilityTelemetry.name, expectedTelemetryData.name);
//             assert.equal(availabilityTelemetry.runLocation, expectedTelemetryData.runLocation);
//         });

//         it("should not crash with invalid input", () => {
//             invalidInputHelper("trackAvailability");
//         });
//     });

//     describe("#trackMetric()", () => {
//         it("should track Metric with correct data", () => {
//             trackStub.reset();
//             var count = 1;
//             var min = 0;
//             var max = 0;
//             var stdev = 0;
//             client.trackMetric({ name: name, value: value });
//             client.trackMetric({ name: name, value: value, count: count, min: min, max: max, stdDev: stdev, properties: properties });

//             assert.ok(trackStub.calledTwice);

//             var metricTelemetry1 = <Contracts.MetricTelemetry>trackStub.firstCall.args[0];
//             var metricTelemetry2 = <Contracts.MetricTelemetry>trackStub.secondCall.args[0];

//             assert.equal(metricTelemetry1.name, name);
//             assert.equal(metricTelemetry1.value, value);

//             assert.equal(metricTelemetry2.name, name);
//             assert.equal(metricTelemetry2.value, value);
//             assert.equal(metricTelemetry2.count, count);
//             assert.equal(metricTelemetry2.min, min);
//             assert.equal(metricTelemetry2.max, max);
//             assert.equal(metricTelemetry2.stdDev, stdev);
//             assert.deepEqual(metricTelemetry2.properties, properties);
//         });

//         it("should not crash with invalid input", () => {
//             invalidInputHelper("trackMetric");
//         });
//     });

//     describe("request tracking", () => {
//         var response = {
//             emitFinish: function (): void {
//                 if (this.finishCallback) {
//                     this.finishCallback();
//                 }
//             },
//             once: function (event: string, callback: Function): eventEmitter.EventEmitter {
//                 if (event === 'finish') {
//                     this.finishCallback = callback;
//                 }
//                 return new eventEmitter.EventEmitter();
//             },
//             statusCode: 200,
//             headers: <{ [id: string]: string }>{},
//             getHeader: function (name: string) { return this.headers[name]; },
//             setHeader: function (name: string, value: string) { this.headers[name] = value; },
//         };

//         var request = {
//             emitError: function (): void {
//                 if (this.errorCallback) {
//                     var error = {
//                         "errorProp": "errorVal"
//                     }
//                     this.errorCallback(error);
//                 }
//             },
//             emitResponse: function (): void {
//                 if (this.responseCallback) {
//                     this.responseCallback(response);
//                 }
//             },
//             on: function (event: string, callback: (error: any) => void): void {
//                 if (event === 'error') {
//                     this.errorCallback = callback;
//                 } else if (event === 'response') {
//                     this.responseCallback = callback;
//                 }
//             },
//             method: "GET",
//             url: "/search?q=test",
//             connection: {
//                 encrypted: false
//             },
//             agent: {
//                 protocol: 'http'
//             },
//             headers: <{ [id: string]: string }>{
//                 host: "bing.com"
//             },
//             getHeader: function (name: string) { return this.headers[name]; },
//             setHeader: function (name: string, value: string) { this.headers[name] = value; },
//         };

//         afterEach(() => {
//             delete request.headers[RequestHeaders.requestContextHeader];
//             delete response.headers[RequestHeaders.requestContextHeader];
//             client.config = new Config(iKey);
//             client.config.correlationId = `cid-v1:${appId}`;
//         });

//         function parseDuration(duration: string): number {
//             if (!duration) {
//                 return 0;
//             }

//             var parts = duration.match("(\\d\\d):(\\d\\d):(\\d\\d).(\\d\\d\\d)");
//             return parseInt(parts[1]) * 60 * 60 * 1000 + parseInt(parts[2]) * 60 * 1000 + parseInt(parts[3]) * 1000 + parseInt(parts[4]);
//         }

//         describe("#trackNodeHttpRequest()", () => {
//             var clock: sinon.SinonFakeTimers;

//             before(() => {
//                 clock = sinon.useFakeTimers();
//             });

//             after(() => {
//                 clock.restore();
//             });

//             it("should not crash with invalid input", () => {
//                 invalidInputHelper("trackRequest");
//             });
//         });

//         describe("#trackException()", () => {
//             it("should track Exception with correct data - Error only", () => {
//                 trackStub.reset();
//                 client.trackException({ exception: new Error(name) });

//                 assert.ok(trackStub.calledOnce);

//                 var exceptionTelemetry = <Contracts.ExceptionTelemetry>trackStub.firstCall.args[0];

//                 assert.equal(exceptionTelemetry.exception.message, name);
//             });

//             it("should track Exception with correct data - Error and properties", () => {
//                 trackStub.reset();
//                 client.trackException({ exception: new Error(name), properties: properties });

//                 assert.ok(trackStub.calledOnce);

//                 var exceptionTelemetry = <Contracts.ExceptionTelemetry>trackStub.firstCall.args[0];
//                 assert.equal(exceptionTelemetry.exception.message, name);
//                 assert.deepEqual(exceptionTelemetry.properties, properties);
//             });

//             it("should track Exception with correct data - Error, properties and measurements", () => {
//                 trackStub.reset();
//                 client.trackException({ exception: new Error(name), properties: properties, measurements: measurements });

//                 assert.ok(trackStub.calledOnce);

//                 var exceptionTelemetry = <Contracts.ExceptionTelemetry>trackStub.firstCall.args[0];

//                 assert.equal(exceptionTelemetry.exception.message, name);
//                 assert.deepEqual(exceptionTelemetry.properties, properties);
//                 assert.deepEqual(exceptionTelemetry.measurements, measurements);
//             });

//             it("should not crash with invalid input", () => {
//                 invalidInputHelper("trackException");
//             });
//         });
//     });

//     describe("#ProcessedByMetricExtractors()", () => {

//         before(() => {
//             let preAggregatedMetrics = new AutoCollectPreAggregatedMetrics(client);
//             preAggregatedMetrics.enable(true);
//         });

//         it("exception telemetry", () => {
//             trackStub.restore();
//             var createEnvelopeSpy = sinon.spy(EnvelopeFactory, "createEnvelope");
//             client.trackException({ exception: new Error(name), properties: properties });
//             assert.ok(createEnvelopeSpy.calledOnce);
//             var envelopeCreated = createEnvelopeSpy.firstCall.returnValue;
//             var obj0 = <Contracts.Data<Contracts.ExceptionData>>envelopeCreated.data;
//             createEnvelopeSpy.restore();
//             assert.equal(obj0.baseData.exceptions[0].message, name);
//             assert.deepEqual(obj0.baseData.properties, exceptionExpectedProperties);
//         });

//         it("trace telemetry", () => {
//             trackStub.restore();
//             var createEnvelopeSpy = sinon.spy(EnvelopeFactory, "createEnvelope");
//             client.trackTrace({ message: name });
//             assert.ok(createEnvelopeSpy.calledOnce);
//             var envelopeCreated = createEnvelopeSpy.firstCall.returnValue;
//             var obj0 = <Contracts.Data<Contracts.TraceTelemetry>>envelopeCreated.data;
//             createEnvelopeSpy.restore();

//             assert.equal(obj0.baseData.message, name);
//             assert.deepEqual(obj0.baseData.properties, traceExpectedProperties);
//         });
//     });

//     describe("#trackDependency()", () => {
//         it("should create envelope with correct properties", () => {
//             trackStub.restore();
//             var commandName = "http://bing.com/search?q=test";
//             var dependencyTypeName = "dependencyTypeName";
//             var createEnvelopeSpy = sinon.spy(EnvelopeFactory, "createEnvelope");
//             client.trackDependency({ name: name, data: commandName, duration: value, success: true, resultCode: "0", dependencyTypeName: dependencyTypeName, properties: properties });
//             assert.ok(createEnvelopeSpy.calledOnce);

//             var envelopeCreated = createEnvelopeSpy.firstCall.returnValue;
//             var obj0 = <Contracts.Data<Contracts.RemoteDependencyData>>envelopeCreated.data;
//             createEnvelopeSpy.restore();

//             assert.equal(obj0.baseData.name, name);
//             assert.equal(obj0.baseData.data, commandName);
//             assert.equal(obj0.baseData.target, 'bing.com');
//             assert.equal(obj0.baseData.duration, Util.msToTimeSpan(value));
//             assert.equal(obj0.baseData.success, true);
//             assert.equal(obj0.baseData.type, dependencyTypeName);
//             assert.deepEqual(obj0.baseData.properties, dependencyExpectedProperties);
//         });

//         it("should create envelope with correct properties (numeric result code)", () => {
//             trackStub.restore();
//             var commandName = "http://bing.com/search?q=test";
//             var dependencyTypeName = "dependencyTypeName";
//             var createEnvelopeSpy = sinon.spy(EnvelopeFactory, "createEnvelope");
//             client.trackDependency({ name: name, data: commandName, duration: value, success: true, resultCode: 0, dependencyTypeName: dependencyTypeName, properties: properties });
//             assert.ok(createEnvelopeSpy.calledOnce);

//             var envelopeCreated = createEnvelopeSpy.firstCall.returnValue;
//             var obj0 = <Contracts.Data<Contracts.RemoteDependencyData>>envelopeCreated.data;
//             createEnvelopeSpy.restore();

//             assert.equal(obj0.baseData.name, name);
//             assert.equal(obj0.baseData.data, commandName);
//             assert.equal(obj0.baseData.target, 'bing.com');
//             assert.equal(obj0.baseData.duration, Util.msToTimeSpan(value));
//             assert.equal(obj0.baseData.success, true);
//             assert.equal(obj0.baseData.type, dependencyTypeName);
//             assert.deepEqual(obj0.baseData.properties, dependencyExpectedProperties);
//         });

//         it("should process the id when specified", () => {
//             trackStub.restore();
//             var commandName = "http://bing.com/search?q=test";
//             var dependencyTypeName = "dependencyTypeName";
//             var createEnvelopeSpy = sinon.spy(EnvelopeFactory, "createEnvelope");
//             client.trackDependency(<Contracts.DependencyTelemetry & Contracts.Identified>{ id: "testid", name: name, data: commandName, duration: value, success: true, resultCode: "0", dependencyTypeName: dependencyTypeName, properties: properties });
//             assert.ok(createEnvelopeSpy.calledOnce);

//             var envelopeCreated = createEnvelopeSpy.firstCall.returnValue;
//             var obj0 = <Contracts.Data<Contracts.RemoteDependencyData>>envelopeCreated.data;
//             createEnvelopeSpy.restore();
//             assert.equal(obj0.baseData.id, "testid");
//             assert.deepEqual(obj0.baseData.properties, dependencyExpectedProperties);
//         });

//         it("should auto-generate the id when not specified", () => {
//             trackStub.restore();
//             var commandName = "http://bing.com/search?q=test";
//             var dependencyTypeName = "dependencyTypeName";
//             var createEnvelopeSpy = sinon.spy(EnvelopeFactory, "createEnvelope");
//             client.trackDependency(<Contracts.DependencyTelemetry>{ name: name, data: commandName, duration: value, success: true, resultCode: "0", dependencyTypeName: dependencyTypeName, properties: properties });
//             assert.ok(createEnvelopeSpy.calledOnce);

//             var envelopeCreated = createEnvelopeSpy.firstCall.returnValue;
//             var obj0 = <Contracts.Data<Contracts.RemoteDependencyData>>envelopeCreated.data;
//             createEnvelopeSpy.restore();
//             assert.ok(!!obj0.baseData.id);
//             assert.deepEqual(obj0.baseData.properties, dependencyExpectedProperties);
//         });

//         it("should autopopulate target field for url data", () => {
//             trackStub.restore();
//             var commandName = "http://bing.com/search?q=test";
//             var dependencyTypeName = "dependencyTypeName";
//             var createEnvelopeSpy = sinon.spy(EnvelopeFactory, "createEnvelope");
//             client.trackDependency(<Contracts.DependencyTelemetry>{ name: name, data: commandName, duration: value, success: true, resultCode: "0", dependencyTypeName: dependencyTypeName, properties: properties });
//             assert.ok(createEnvelopeSpy.calledOnce);

//             var envelopeCreated = createEnvelopeSpy.firstCall.returnValue;
//             var obj0 = <Contracts.Data<Contracts.RemoteDependencyData>>envelopeCreated.data;
//             createEnvelopeSpy.restore();
//             assert.equal(obj0.baseData.target, "bing.com");
//         });

//         it("should not autopopulate target field for non-url data", () => {
//             trackStub.restore();
//             var commandName = "NOT A URL";
//             var dependencyTypeName = "dependencyTypeName";
//             var createEnvelopeSpy = sinon.spy(EnvelopeFactory, "createEnvelope");
//             client.trackDependency(<Contracts.DependencyTelemetry>{ name: name, data: commandName, duration: value, success: true, resultCode: "0", dependencyTypeName: dependencyTypeName, properties: properties });
//             assert.ok(createEnvelopeSpy.calledOnce);

//             var envelopeCreated = createEnvelopeSpy.firstCall.returnValue;
//             var obj0 = <Contracts.Data<Contracts.RemoteDependencyData>>envelopeCreated.data;
//             createEnvelopeSpy.restore();
//             assert.equal(obj0.baseData.target, null);
//         });
//     });

//     describe("#trackRequest()", () => {
//         it("should create envelope with correct properties", () => {
//             trackStub.restore();
//             var url = "http://bing.com/search?q=test";
//             var createEnvelopeSpy = sinon.spy(EnvelopeFactory, "createEnvelope");
//             client.trackRequest({ url: url, source: "source", name: name, duration: value, success: true, resultCode: "200", properties: properties });
//             assert.ok(createEnvelopeSpy.calledOnce);

//             var envelopeCreated = createEnvelopeSpy.firstCall.returnValue;
//             var obj0 = <Contracts.Data<Contracts.RequestData>>envelopeCreated.data;
//             createEnvelopeSpy.restore();

//             assert.equal(obj0.baseData.name, name);
//             assert.equal(obj0.baseData.url, url);
//             assert.equal(obj0.baseData.source, 'source');
//             assert.equal(obj0.baseData.duration, Util.msToTimeSpan(value));
//             assert.equal(obj0.baseData.success, true);
//             assert.equal(obj0.baseData.responseCode, "200");
//             assert.deepEqual(obj0.baseData.properties, requestExpectedProperties);
//         });

//         it("should create envelope with correct properties (numeric resultCode)", () => {
//             trackStub.restore();
//             var url = "http://bing.com/search?q=test";
//             var createEnvelopeSpy = sinon.spy(EnvelopeFactory, "createEnvelope");
//             client.trackRequest({ url: url, source: "source", name: name, duration: value, success: true, resultCode: 200, properties: properties });
//             assert.ok(createEnvelopeSpy.calledOnce);

//             var envelopeCreated = createEnvelopeSpy.firstCall.returnValue;
//             var obj0 = <Contracts.Data<Contracts.RequestData>>envelopeCreated.data;
//             createEnvelopeSpy.restore();

//             assert.equal(obj0.baseData.name, name);
//             assert.equal(obj0.baseData.url, url);
//             assert.equal(obj0.baseData.source, 'source');
//             assert.equal(obj0.baseData.duration, Util.msToTimeSpan(value));
//             assert.equal(obj0.baseData.success, true);
//             assert.equal(obj0.baseData.responseCode, "200");
//             assert.deepEqual(obj0.baseData.properties, requestExpectedProperties);
//         });

//         it("should process the id when specified", () => {
//             trackStub.restore();
//             var url = "http://bing.com/search?q=test";
//             var createEnvelopeSpy = sinon.spy(EnvelopeFactory, "createEnvelope");
//             client.trackRequest(<Contracts.RequestTelemetry & Contracts.Identified>{ id: "testid", url: url, source: "source", name: name, duration: value, success: true, resultCode: "200", properties: properties });
//             assert.ok(createEnvelopeSpy.calledOnce);

//             var envelopeCreated = createEnvelopeSpy.firstCall.returnValue;
//             var obj0 = <Contracts.Data<Contracts.RequestData>>envelopeCreated.data;
//             createEnvelopeSpy.restore();

//             assert.equal(obj0.baseData.id, "testid");
//             assert.deepEqual(obj0.baseData.properties, requestExpectedProperties);
//         });

//         it("should auto-generate the id when not specified", () => {
//             trackStub.restore();
//             var url = "http://bing.com/search?q=test";
//             var createEnvelopeSpy = sinon.spy(EnvelopeFactory, "createEnvelope");
//             client.trackRequest({ url: url, source: "source", name: name, duration: value, success: true, resultCode: "200", properties: properties });
//             assert.ok(createEnvelopeSpy.calledOnce);

//             var envelopeCreated = createEnvelopeSpy.firstCall.returnValue;
//             var obj0 = <Contracts.Data<Contracts.RequestData>>envelopeCreated.data;
//             createEnvelopeSpy.restore();

//             assert.ok(!!obj0.baseData.id);
//             assert.deepEqual(obj0.baseData.properties, requestExpectedProperties);
//         });
//     });

//     describe("#flush()", () => {

//         afterEach(() => {
//             client.clearTelemetryProcessors();
//             saveOnCrashStub.reset();
//             sendStub.restore();
//             sendStub = sinon.stub(client.channel, "send");
//             triggerStub.restore();
//             triggerStub = sinon.stub(client.channel, "triggerSend");
//         });

//         it("should invoke the sender", () => {
//             triggerStub.reset();
//             client.flush();
//             assert.ok(triggerStub.calledOnce);
//         });

//         it("should accept a callback", () => {
//             triggerStub.reset();
//             var callback = sinon.spy();
//             client.flush({ callback: callback });
//             assert.strictEqual(triggerStub.firstCall.args[0], false);
//             assert.strictEqual(triggerStub.firstCall.args[1], callback);
//         });

//         it("should save on disk when isAppCrashing option is set to true", () => {
//             sendStub.reset();
//             client.flush({ isAppCrashing: true });
//             assert.ok(sendStub.notCalled, "saveOnCrash should be called, not send");
//             saveOnCrashStub.reset();

//             // temporarily restore send and trigger stubs to allow saveOnCrash to be called
//             sendStub.restore();
//             triggerStub.restore();

//             // fake something in the buffer
//             var testEnvelope = new Contracts.Envelope();
//             client.channel._buffer.push(testEnvelope);
//             client.flush({ isAppCrashing: true });

//             assert.ok(saveOnCrashStub.calledOnce);
//             saveOnCrashStub.restore();

//         });

//     });

//     describe("#track()", () => {
//         it("should pass data to the channel", () => {
//             sendStub.reset();

//             trackStub.restore();
//             client.track(testEventTelemetry, Contracts.TelemetryType.Event);
//             trackStub = sinon.stub(client, "track");

//             assert.ok(sendStub.calledOnce);
//         });

//         it("should send the envelope that was created", () => {
//             sendStub.reset();
//             var createEnvelopeSpy = sinon.spy(EnvelopeFactory, "createEnvelope");
//             trackStub.restore();
//             client.track(testEventTelemetry, Contracts.TelemetryType.Event);
//             trackStub = sinon.stub(client, "track");

//             var expected = createEnvelopeSpy.firstCall.returnValue;
//             var actual = sendStub.firstCall.args[0];
//             createEnvelopeSpy.restore();

//             assert.deepEqual(actual, expected);
//         });

//         it("should use timestamp if it was set", () => {
//             var timestamp = new Date("Mon Aug 28 2017 11:44:17");
//             var createEnvelopeSpy = sinon.spy(EnvelopeFactory, "createEnvelope");
//             trackStub.restore();
//             client.trackEvent({ name: "eventName", time: timestamp });
//             trackStub = sinon.stub(client, "track");
//             var envelope = <Contracts.Envelope>createEnvelopeSpy.firstCall.returnValue;
//             createEnvelopeSpy.restore();
//             assert.equal(envelope.time, timestamp.toISOString());
//         });

//         it("telemetry processor can change the envelope", () => {
//             trackStub.restore();
//             var expectedName = "I was here";

//             client.addTelemetryProcessor((env) => {
//                 env.name = expectedName;
//                 return true;
//             });

//             client.track(testEventTelemetry, Contracts.TelemetryType.Event);

//             assert.equal(sendStub.callCount, 1, "send called once");

//             var actualData = sendStub.firstCall.args[0] as Contracts.Envelope;
//             assert.equal(actualData.name, expectedName, "envelope name should be changed by the processor");
//         });

//         it("setAutoPopulateAzureProperties", () => {
//             trackStub.restore();
//             const env = <{ [id: string]: string }>{};
//             const originalEnv = process.env;
//             env.WEBSITE_SITE_NAME = "testRole";
//             env.WEBSITE_INSTANCE_ID = "627cc493-f310-47de-96bd-71410b7dec09";
//             process.env = env;
//             client.setAutoPopulateAzureProperties(true);
//             client.track(testEventTelemetry, Contracts.TelemetryType.Event);
//             process.env = originalEnv;
//             assert.equal(sendStub.callCount, 1, "send called once");
//             var actualData = sendStub.firstCall.args[0] as Contracts.Envelope;
//             assert.equal(actualData.tags[client.context.keys.cloudRole], "testRole");
//             assert.equal(actualData.tags[client.context.keys.cloudRoleInstance], "627cc493-f310-47de-96bd-71410b7dec09");
//         });

//         it("telemetry processor can access the context object", () => {
//             trackStub.restore();
//             var expectedName = "I was here";

//             client.addTelemetryProcessor((env, contextObjects) => {
//                 env.name = contextObjects["name"];
//                 return true;
//             });
//             testEventTelemetry.contextObjects = { "name": expectedName };

//             client.track(testEventTelemetry, Contracts.TelemetryType.Event);
//             testEventTelemetry.contextObjects = undefined;

//             assert.equal(sendStub.callCount, 1, "send called once");

//             var actualData = sendStub.firstCall.args[0] as Contracts.Envelope;
//             assert.equal(actualData.name, expectedName, "envelope name should be changed by the processor");
//         });

//         it("telemetry processors are executed in a right order", () => {
//             trackStub.restore();

//             client.addTelemetryProcessor((env) => {
//                 env.name = "First";
//                 return true;
//             });

//             client.addTelemetryProcessor((env) => {
//                 env.name += ", Second";
//                 return true;
//             });

//             client.addTelemetryProcessor((env) => {
//                 env.name += ", Third";
//                 return true;
//             });
//             client.track(testEventTelemetry, Contracts.TelemetryType.Event);
//             assert.equal(sendStub.callCount, 1, "send called once");

//             var actualData = sendStub.firstCall.args[0] as Contracts.Envelope;
//             assert.equal(actualData.name, "First, Second, Third", "processors should executed in the right order");
//         });

//         it("envelope rejected by the telemetry processor will not be sent", () => {
//             trackStub.restore();

//             client.addTelemetryProcessor((env) => {
//                 return false;
//             });

//             client.track(testEventTelemetry, Contracts.TelemetryType.Event);

//             assert.ok(sendStub.notCalled, "send should not be called");
//         });

//         it("envelope is sent when processor throws exception", () => {
//             trackStub.restore();

//             client.addTelemetryProcessor((env): boolean => {
//                 throw "telemetry processor failed";
//             });

//             client.addTelemetryProcessor((env): boolean => {
//                 env.name = "more data";
//                 return true;
//             });

//             client.track(testEventTelemetry, Contracts.TelemetryType.Event);

//             assert.ok(sendStub.called, "send should be called despite telemetry processor failure");
//             var actualData = sendStub.firstCall.args[0] as Contracts.Envelope;
//             assert.equal(actualData.name, "more data", "more data is added as part of telemetry processor");
//         });
//     });

//     describe("#addTelemetryProcessor()", () => {
//         it("adds telemetry processor to the queue", () => {
//             trackStub.restore();
//             var processorExecuted = false;

//             client.addTelemetryProcessor((env) => {
//                 processorExecuted = true;
//                 return true;
//             });

//             client.track(testEventTelemetry, Contracts.TelemetryType.Event);

//             assert.ok(processorExecuted, "telemetry processor should be executed");
//         });
//     });

//     describe("#clearTelemetryProcessors()", () => {
//         it("removes all processors from the telemetry processors list", () => {
//             trackStub.restore();
//             var processorExecuted = false;

//             client.addTelemetryProcessor((env) => {
//                 processorExecuted = true;
//                 return true;
//             });

//             client.clearTelemetryProcessors();
//             client.track(testEventTelemetry, Contracts.TelemetryType.Event);

//             assert.ok(!processorExecuted, "telemetry processor should NOT be executed");
//         });
//     });
// });
