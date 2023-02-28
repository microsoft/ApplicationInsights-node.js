import http = require("http");
import https = require("https");
import assert = require("assert");
import path = require("path")
import os = require("os")
import fs = require('fs');
import sinon = require("sinon");
import events = require("events");
import child_process = require("child_process");
import nock = require("nock");
import AppInsights = require("../applicationinsights");
import Sender = require("../Library/Sender");
import Traceparent = require("../Library/Traceparent");
import { EventEmitter } from "events";
import { CorrelationContextManager } from "../AutoCollection/CorrelationContextManager";
import Constants = require("../Declarations/Constants");
import Contracts = require("../Declarations/Contracts");
import HeartBeat = require("../AutoCollection/HeartBeat");
import TelemetryClient = require("../Library/TelemetryClient");
import Context = require("../Library/Context");
import Util = require("../Library/Util");
import { JsonConfig } from "../Library/JsonConfig";
import { FileAccessControl } from "../Library/FileAccessControl";
import FileSystemHelper = require("../Library/FileSystemHelper");
import AutoCollectHttpRequests = require("../AutoCollection/HttpRequests");

/**
 * A fake response class that passes by default
 */
class fakeResponse {
    private callbacks: { [event: string]: (data?: any) => void } = Object.create(null);
    public setEncoding(): void { };
    public statusCode: number = 200;
    private _responseData: any;

    constructor(private passImmediately: boolean = true, responseData?: any) {
        this._responseData = responseData ? responseData : "data";
    }

    public on(event: string, callback: () => void) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = callback;
        } else {
            var lastCallback = this.callbacks[event];
            this.callbacks[event] = () => {
                callback();
                lastCallback();
            };
        }

        if (event == "end" && this.passImmediately) {
            this.pass(true);
        }
    }

    public emit(eventName: string, ...args: any[]): boolean {
        return true;
    }

    public addListener(eventName: string, listener: () => void): void {
        this.on(eventName, listener);
    }

    public removeListener(eventName: string, listener: () => void) {

    }

    public pass(test = false): void {
        this.callbacks["data"] ? this.callbacks["data"](this._responseData) : null;
        this.callbacks["end"] ? this.callbacks["end"]() : null;
        this.callbacks["finish"] ? this.callbacks["finish"]() : null;
    }

    public end = this.pass;
    public once = this.on;
}

/**
 * A fake request class that fails by default
 */
class fakeRequest {
    private callbacks: { [event: string]: Function } = Object.create(null);
    public write(): void { }
    public headers: { [id: string]: string } = {};
    public agent = { protocol: 'http' };
    private _responseData: any;

    constructor(private failImmediatly: boolean = true, public url: string = undefined, responseData?: any) {
        this._responseData = responseData;
    }

    public on(event: string, callback: Function) {
        this.callbacks[event] = callback;
        if (event === "error" && this.failImmediatly) {
            setImmediate(() => this.fail());
        }
    }

    public emit(eventName: string, ...args: any[]): boolean {
        return true;
    }

    public addListener(eventName: string, listener: Function): void {
        this.on(eventName, listener);
    }

    public removeListener(eventName: string, listener?: Function) {

    }

    public setTimeout(value: number, callback: () => void) {

    }

    public abort() {
        
    }

    public fail(): void {
        this.callbacks["error"] ? this.callbacks["error"]() : null;
    }

    public end(): void {
        this.callbacks["end"] ? this.callbacks["end"](new fakeResponse(true, this._responseData)) : null;
    }
}

/**
 * A fake http server
 */
class fakeHttpServer extends events.EventEmitter {
    public setCallback(callback: any) {
        this.on("request", callback);
    }

    public listen(port: any, host?: any, backlog?: any, callback?: any) {
        this.emit("listening");
    }

    public emitRequest(url: string) {
        var request = new fakeRequest(false, url);
        var response = new fakeResponse(false);
        this.emit("request", request, response);
        request.end();
    }
}

/**
 * A fake https server class that doesn't require ssl certs
 */
class fakeHttpsServer extends events.EventEmitter {

    public setCallback(callback: any) {
        this.on("request", callback);
    }

    public listen(port: any, host?: any, backlog?: any, callback?: any) {
        this.emit("listening");
    }

    public emitRequest(url: string) {
        var request = new fakeRequest(false, url);
        var response = new fakeResponse(false);
        this.emit("request", request, response);
        request.end();
        response.pass();
    }
}

describe("EndToEnd", () => {
    var sandbox: sinon.SinonSandbox;
    var originalEnv = {};
    let interceptor: nock.Interceptor;

    var breezeResponse: Contracts.BreezeResponse = {
        itemsAccepted: 1,
        itemsReceived: 1,
        errors: []
    };

    before(() => {
        sandbox = sinon.sandbox.create();
        var newEnv = <{ [id: string]: string }>{};
        Util.tlsRestrictedAgent = new https.Agent();
        newEnv["APPLICATION_INSIGHTS_NO_STATSBEAT"] = "true";
        newEnv["TMP"] = process.env.TMP;
        newEnv["TMPDIR"] = process.env.TMPDIR;
        newEnv["TEMP"] = process.env.TEMP;
        originalEnv = process.env;
        process.env = newEnv;

        interceptor = nock(Constants.DEFAULT_BREEZE_ENDPOINT)
            .post("/v2.1/track", (body: string) => {
                return true;
            });
        nock.disableNetConnect();
    });

    after(() => {
        process.env = originalEnv;
        nock.cleanAll();
        nock.enableNetConnect();
    });

    describe("Basic usage", () => {
        let nockScope: nock.Scope;

        before(() => {
            nockScope = interceptor.reply(200, breezeResponse).persist();
        });

        beforeEach(() => {
            JsonConfig["_instance"] = undefined;
        });

        afterEach(() => {
            // Dispose the default app insights client and auto collectors so that they can be reconfigured
            // cleanly for each test
            sandbox.restore();

            CorrelationContextManager.reset();
            AppInsights.dispose();
        });

        it("should send telemetry", (done) => {
            const expectedTelemetryData: AppInsights.Contracts.AvailabilityTelemetry = {
                duration: 100, id: "id1", message: "message1", success: true, name: "name1", runLocation: "east us"
            };

            var client = new AppInsights.TelemetryClient("iKey");

            client.trackEvent({ name: "test event" });
            client.trackException({ exception: new Error("test error") });
            client.trackMetric({ name: "test metric", value: 3 });
            client.trackTrace({ message: "test trace" });
            client.trackAvailability(expectedTelemetryData);

            client.flush({
                callback: (response) => {
                    assert.ok(response, "response should not be empty");
                    assert.ok(response !== "no data to send", "response should have data");
                    done();
                }
            });
        });

        it("should collect http request telemetry", (done) => {
            var fakeHttpSrv = new fakeHttpServer();
            sandbox.stub(http, 'createServer', (callback: (req: http.ServerRequest, res: http.ServerResponse) => void) => {
                fakeHttpSrv.setCallback(callback);
                return fakeHttpSrv;
            });

            // We stub the property indicating if the handler on http(s).createServer is ready so that the handler is
            // placed on the function http(s).createServer stub
            sandbox.stub(AutoCollectHttpRequests, 'HANDLER_READY', false);

            AppInsights
                .setup("ikey")
                .setAutoCollectRequests(true)
                .start();

            var track = sandbox.stub(AppInsights.defaultClient, 'track');
            http.createServer((req, res) => {
                assert.equal(track.callCount, 0);
                res.end();
                assert.equal(track.callCount, 1);
                done();
            });

            fakeHttpSrv.emitRequest("http://localhost:0/test");
        });

        it("should collect https request telemetry", (done) => {
            var fakeHttpSrv = new fakeHttpServer();
            sandbox.stub(https, 'createServer', (options: any, callback: (req: http.ServerRequest, res: http.ServerResponse) => void) => {
                fakeHttpSrv.setCallback(callback);
                return fakeHttpSrv;
            });

            // We stub the property indicating if the handler on http(s).createServer is ready so that the handler is
            // placed on the function http(s).createServer stub
            sandbox.stub(AutoCollectHttpRequests, 'HANDLER_READY', false);

            AppInsights
                .setup("ikey")
                .setAutoCollectRequests(true)
                .start();

            var track = sandbox.stub(AppInsights.defaultClient, 'track');
            https.createServer(null, (req: http.ServerRequest, res: http.ServerResponse) => {
                assert.equal(track.callCount, 0);
                res.end();
                assert.equal(track.callCount, 1);
                done();
            });

            fakeHttpSrv.emitRequest("http://localhost:0/test");
        });

        it("should collect http dependency telemetry", (done) => {
            var eventEmitter = new EventEmitter();
            (<any>eventEmitter).method = "GET";
            sandbox.stub(http, 'request', (url: string, c: Function) => {
                process.nextTick(c);
                return eventEmitter;
            });

            AppInsights
                .setup("ikey")
                .setAutoCollectDependencies(true)
                .start();

            var track = sandbox.stub(AppInsights.defaultClient, 'track');

            http.request(<any>'http://test.com', (c) => {
                assert.equal(track.callCount, 0);
                eventEmitter.emit("response", {});
                assert.equal(track.callCount, 1);
                done();
            });
        });

        it("should collect https dependency telemetry", (done) => {
            sandbox.restore();
            var eventEmitter = new EventEmitter();
            (<any>eventEmitter).method = "GET";
            sandbox.stub(https, 'request', (url: string, c: Function) => {
                process.nextTick(c);
                return eventEmitter;
            });

            AppInsights
                .setup("ikey")
                .setAutoCollectDependencies(true)
                .start();

            var track = sandbox.stub(AppInsights.defaultClient, 'track');

            https.request(<any>'https://test.com', (c) => {
                assert.equal(track.callCount, 0);
                eventEmitter.emit("response", {});
                assert.equal(track.callCount, 1);
                done();
            });
        });

        it("should add correlation context if not available", (done) => {
            var eventEmitter = new EventEmitter();
            (<any>eventEmitter).method = "GET";
            sandbox.stub(http, 'request', (url: string, c: Function) => {
                process.nextTick(c);
                return eventEmitter;
            });

            let generateContextSpy = sandbox.spy(CorrelationContextManager, "generateContextObject");
            AppInsights
                .setup("ikey")
                .setAutoCollectDependencies(true)
                .setAutoDependencyCorrelation(true);
            AppInsights.start();
            sandbox.stub(AppInsights.defaultClient, 'track');

            http.request(<any>'http://test.com', (c) => {
                assert.equal(generateContextSpy.callCount, 1);
                done();
            });
        });
    });

    describe("W3C mode", () => {
        let nockScope: nock.Scope;

        before(() => {
            nockScope = interceptor.reply(200, breezeResponse).persist();
        });

        beforeEach(() => {
            JsonConfig["_instance"] = undefined;
        });

        afterEach(() => {
            // Dispose the default app insights client and auto collectors so that they can be reconfigured
            // cleanly for each test
            sandbox.restore();
            CorrelationContextManager.reset();
            AppInsights.dispose();
        });

        it("should pass along traceparent/tracestate header if present in current operation", (done) => {
            var eventEmitter = new EventEmitter();
            (eventEmitter as any).headers = {};
            (eventEmitter as any)["getHeader"] = function (name: string) { return this.headers[name]; };
            (eventEmitter as any)["setHeader"] = function (name: string, value: string) { this.headers[name] = value; };
            (<any>eventEmitter).method = "GET";
            sandbox.stub(https, 'request', (url: string, c: Function) => {
                process.nextTick(c);
                return eventEmitter;
            });

            AppInsights
                .setup("ikey")
                .setAutoCollectDependencies(true)
                .start();

            sandbox.stub(CorrelationContextManager, "getCurrentContext", () => ({
                operation: {
                    traceparent: new Traceparent("00-5e84aff3af474588a42dcbf3bd1db95f-1fc066fb77fa43a3-00"),
                    tracestate: "sometracestate"
                },
                customProperties: {
                    serializeToHeader: (): null => null
                }
            }));
            https.request(<any>'https://test.com', (c) => {
                eventEmitter.emit("response", {});
                assert.ok((eventEmitter as any).headers["request-id"].match(/^\|[0-z]{32}\.[0-z]{16}\./g));
                assert.ok((eventEmitter as any).headers.traceparent.match(/^00-5e84aff3af474588a42dcbf3bd1db95f-[0-z]{16}-00$/));
                assert.notEqual((eventEmitter as any).headers.traceparent, "00-5e84aff3af474588a42dcbf3bd1db95f-1fc066fb77fa43a3-00");
                assert.equal((eventEmitter as any).headers.tracestate, "sometracestate");
                AppInsights.defaultClient.flush();
                done();
            });
        });

        it("should create and pass a traceparent header if w3c is enabled", (done) => {
            var eventEmitter = new EventEmitter();
            (eventEmitter as any).headers = {};
            (eventEmitter as any)["getHeader"] = function (name: string) { return this.headers[name]; };
            (eventEmitter as any)["setHeader"] = function (name: string, value: string) { this.headers[name] = value; };
            (<any>eventEmitter).method = "GET";
            sandbox.stub(https, 'request', (url: string, c: Function) => {
                process.nextTick(c);
                return eventEmitter;
            });
            var CorrelationIdManager = require("../Library/CorrelationIdManager");

            AppInsights
                .setup("ikey")
                .setAutoCollectDependencies(true)
                .start();

            CorrelationIdManager.w3cEnabled = true;

            sandbox.stub(CorrelationContextManager, "getCurrentContext", () => ({
                operation: {
                },
                customProperties: {
                    serializeToHeader: (): null => null
                }
            }));
            https.request(<any>'https://test.com', (c) => {
                eventEmitter.emit("response", {});
                assert.ok((eventEmitter as any).headers.traceparent.match(/^00-[0-z]{32}-[0-z]{16}-[0-9a-f]{2}/g), "traceparent header is passed, 00-W3C-W3C-00");
                assert.ok((eventEmitter as any).headers["request-id"].match(/^\|[0-z]{32}\.[0-z]{16}\./g), "back compat header is also passed, |W3C.W3C." + (eventEmitter as any).headers["request-id"]);
                CorrelationIdManager.w3cEnabled = false;
                AppInsights.defaultClient.flush();
                done();
            });
        });
    });

    describe("Disk retry mode", () => {
        var CorrelationIdManager = require("../Library/CorrelationIdManager");
        var writeFile: sinon.SinonStub;
        var writeFileSync: sinon.SinonStub;
        var readFile: sinon.SinonStub;
        var lstat: sinon.SinonStub;
        var mkdir: sinon.SinonStub;
        var existsSync: sinon.SinonStub;
        var readdir: sinon.SinonStub;
        var readdirSync: sinon.SinonStub;
        var stat: sinon.SinonStub;
        var statSync: sinon.SinonStub;
        var mkdirSync: sinon.SinonStub;
        var spawn: sinon.SinonStub;
        var spawnSync: sinon.SinonStub;

        let nockScope: nock.Scope;

        beforeEach(() => {
            nockScope = interceptor.reply(503, { "errors": [{ "index": 0, "statusCode": 503 }] });
            AppInsights.defaultClient = undefined;
            writeFile = sandbox.stub(FileSystemHelper, 'writeFileAsync');
            writeFileSync = sandbox.stub(fs, 'writeFileSync');
            existsSync = sandbox.stub(fs, 'existsSync').returns(true);
            readdir = sandbox.stub(FileSystemHelper, 'readdirAsync').returns(['1.ai.json']);
            readdirSync = sandbox.stub(fs, 'readdirSync').returns(['1.ai.json']);
            stat = sandbox.stub(FileSystemHelper, 'statAsync').returns({ isFile: () => true, size: 8000 });
            statSync = sandbox.stub(fs, 'statSync').returns({ isFile: () => true, size: 8000 });
            lstat = sandbox.stub(FileSystemHelper, 'lstatAsync').returns({ isDirectory: () => true });
            mkdir = sandbox.stub(FileSystemHelper, 'mkdirAsync').returns(null);
            mkdirSync = sandbox.stub(fs, 'mkdirSync').returns(null);
            readFile = sandbox.stub(FileSystemHelper, 'readFileAsync').returns('');
            spawn = sandbox.stub(child_process, 'spawn').returns({
                on: (type: string, cb: any) => {
                    if (type === 'close') {
                        cb(0);
                    }
                },
                stdout: {
                    on: (type: string, cb: any) => {
                        if (type === 'data') {
                            cb('stdoutmock');
                        }
                    }
                }
            });
            if (child_process.spawnSync) {
                spawnSync = sandbox.stub(child_process, 'spawnSync').returns({ status: 0, stdout: 'stdoutmock' });
            }
            JsonConfig["_instance"] = undefined;
        });

        afterEach(() => {
            sandbox.restore();
            AppInsights.dispose();
        });

        it("disabled by default for new clients", (done) => {
            var client = new AppInsights.TelemetryClient("key");
            client.trackEvent({ name: "test event" });

            client.flush({
                callback: (response: any) => {
                    // yield for the caching behavior
                    setImmediate(() => {
                        assert(writeFile.callCount === 0);
                        done();
                    });
                }
            });
        });

        it("enabled by default for default client", (done) => {
            AppInsights.setup("key").start();
            var client = AppInsights.defaultClient;
            client.trackEvent({ name: "test event" });
            client.flush({
                callback: (response: any) => {
                    // yield for the caching behavior
                    setImmediate(() => {
                        assert.equal(writeFile.callCount, 1);
                        done();
                    });
                }
            });
        });

        it("stores data to disk when enabled", (done) => {
            var client = new AppInsights.TelemetryClient("key");
            client.channel.setUseDiskRetryCaching(true);

            client.trackEvent({ name: "test event" });

            client.flush({
                callback: (response: any) => {
                    // yield for the caching behavior
                    setImmediate(() => {
                        assert.equal(writeFile.callCount, 1);
                        assert.equal(
                            path.dirname(writeFile.firstCall.args[0]),
                            path.join(os.tmpdir(), Sender.TEMPDIR_PREFIX + "key"));
                        assert.equal(writeFile.firstCall.args[2].mode, 0o600, "File must not have weak permissions");
                        assert.equal(spawn.callCount, 0);
                        done();
                    });
                }
            });
        });

        it("uses WindowsIdentity to get the identity for ICACLS", (done) => {
            var client = new AppInsights.TelemetryClient("uniquekey");
            client.channel.setUseDiskRetryCaching(true);
            var origICACLS = FileAccessControl.USE_ICACLS;
            FileAccessControl.USE_ICACLS = true; // Simulate ICACLS environment even on *nix

            // Clear ICACLS caches for test purposes
            FileAccessControl["ACLED_DIRECTORIES"] = {};
            FileAccessControl["ACL_IDENTITY"] = null;

            client.trackEvent({ name: "test event" });
            client.flush({
                callback: (response: any) => {
                    // yield for the caching behavior
                    setImmediate(() => {
                        assert.equal(writeFile.callCount, 1);
                        assert.equal(spawn.callCount, 2);

                        // First external call should be to powershell to query WindowsIdentity
                        assert(spawn.firstCall.args[0].indexOf('powershell.exe'));
                        assert.equal(spawn.firstCall.args[1][0], "-Command");
                        assert.equal(spawn.firstCall.args[1][1], "[System.Security.Principal.WindowsIdentity]::GetCurrent().Name");
                        assert.equal(FileAccessControl["ACL_IDENTITY"], 'stdoutmock');

                        // Next call should be to ICACLS (with the acquired identity)
                        assert(spawn.lastCall.args[0].indexOf('icacls.exe'));
                        assert.equal(spawn.lastCall.args[1][3], "/grant");
                        assert.equal(spawn.lastCall.args[1][4], "stdoutmock:(OI)(CI)F");

                        FileAccessControl["USE_ICACLS"] = origICACLS;
                        done();
                    });
                }
            });
        });

        it("refuses to store data if ACL identity fails", (done) => {
            spawn.restore();
            var tempSpawn = sandbox.stub(child_process, 'spawn').returns({
                on: (type: string, cb: any) => {
                    if (type == 'close') {
                        cb(2000); // return non-zero status code
                    }
                },
                stdout: {
                    on: (type: string, cb: any) => {
                        return; // do nothing
                    }
                }
            });
            var client = new AppInsights.TelemetryClient("uniquekey");
            client.channel.setUseDiskRetryCaching(true);
            var origICACLS = FileAccessControl.USE_ICACLS;
            FileAccessControl.USE_ICACLS = true; // Simulate ICACLS environment even on *nix
            // Clear ICACLS caches for test purposes
            FileAccessControl["ACLED_DIRECTORIES"] = {};
            FileAccessControl["ACL_IDENTITY"] = null;

            client.trackEvent({ name: "test event" });
            client.flush({
                callback: (response: any) => {
                    // yield for the caching behavior
                    setImmediate(() => {
                        assert(writeFile.callCount === 0);
                        assert.equal(tempSpawn.callCount, 1);
                        FileAccessControl.USE_ICACLS = origICACLS;
                        done();
                    });
                }
            });
        });

        it("refuses to query for ACL identity twice", (done) => {
            spawn.restore();
            var tempSpawn = sandbox.stub(child_process, 'spawn').returns({
                on: (type: string, cb: any) => {
                    if (type == 'close') {
                        cb(2000); // return non-zero status code
                    }
                },
                stdout: {
                    on: (type: string, cb: any) => {
                        return; // do nothing
                    }
                }
            });
            var client = new AppInsights.TelemetryClient("uniquekey");
            client.channel.setUseDiskRetryCaching(true);
            var origICACLS = FileAccessControl.USE_ICACLS;
            FileAccessControl.USE_ICACLS = true; // Simulate ICACLS environment even on *nix

            // Clear ICACLS caches for test purposes
            FileAccessControl["ACLED_DIRECTORIES"] = {};
            FileAccessControl["ACL_IDENTITY"] = null;

            client.trackEvent({ name: "test event" });

            client.flush({
                callback: (response: any) => {
                    // yield for the caching behavior
                    setTimeout(() => {
                        assert(writeFile.callCount === 0);
                        assert.equal(tempSpawn.callCount, 1);

                        client.trackEvent({ name: "test event" });

                        client.flush({
                            callback: (response: any) => {
                                // yield for the caching behavior
                                setImmediate(() => {
                                    // The call counts shouldnt have changed
                                    assert(writeFile.callCount === 0);
                                    assert.equal(tempSpawn.callCount, 1);
                                    FileAccessControl.USE_ICACLS = origICACLS;
                                    done();
                                });
                            }
                        });
                    }, 100);
                }
            });
        });

        it("refuses to query for ACL identity twice (process never returned)", (done) => {
            spawn.restore();
            var tempSpawn = sandbox.stub(child_process, 'spawn').returns({
                on: (type: string, cb: any) => {
                    return; // do nothing
                },
                stdout: {
                    on: (type: string, cb: any) => {
                        return; // do nothing
                    }
                }
            });

            var client = new AppInsights.TelemetryClient("uniquekey");
            client.channel.setUseDiskRetryCaching(true);
            var origICACLS = FileAccessControl.USE_ICACLS;
            FileAccessControl.USE_ICACLS = true; // Simulate ICACLS environment even on *nix

            // Clear ICACLS caches for test purposes
            FileAccessControl["ACLED_DIRECTORIES"] = {};
            FileAccessControl["ACL_IDENTITY"] = null;

            client.trackEvent({ name: "test event" });
            client.flush({
                callback: (response: any) => {
                    // yield for the caching behavior
                    setImmediate(() => {
                        assert(writeFile.callCount === 0);
                        assert.equal(tempSpawn.callCount, 1);
                        client.trackEvent({ name: "test event" });
                        client.flush({
                            callback: (response: any) => {
                                // yield for the caching behavior
                                setImmediate(() => {
                                    // The call counts shouldnt have changed
                                    assert(writeFile.callCount === 0);
                                    assert.equal(tempSpawn.callCount, 1);
                                    FileAccessControl.USE_ICACLS = origICACLS;
                                    done();
                                });
                            }
                        });
                    });
                }
            });
        });

        it("refuses to store data if ICACLS fails", (done) => {
            spawn.restore();
            var tempSpawn = sandbox.stub(child_process, 'spawn').returns({
                on: (type: string, cb: any) => {
                    if (type == 'close') {
                        cb(2000); // return non-zero status code
                    }
                }
            });

            var client = new AppInsights.TelemetryClient("uniquekey");
            client.channel.setUseDiskRetryCaching(true);
            var origICACLS = FileAccessControl.USE_ICACLS;
            FileAccessControl.USE_ICACLS = true; // Simulate ICACLS environment even on *nix

            // Clear ICACLS caches for test purposes
            FileAccessControl["ACLED_DIRECTORIES"] = {};
            FileAccessControl["ACL_IDENTITY"] = null;

            client.trackEvent({ name: "test event" });
            client.flush({
                callback: (response: any) => {
                    // yield for the caching behavior
                    setImmediate(() => {
                        assert(writeFile.callCount === 0);
                        assert.equal(tempSpawn.callCount, 1);
                        FileAccessControl.USE_ICACLS = origICACLS;
                        done();
                    });
                }
            });
        });

        it("creates directory when nonexistent", (done) => {
            lstat.restore();
            sandbox.stub(FileSystemHelper, 'lstatAsync').throws({ code: "ENOENT" });
            var client = new AppInsights.TelemetryClient("key");
            client.channel.setUseDiskRetryCaching(true);

            client.trackEvent({ name: "test event" });
            client.flush({
                callback: (response: any) => {
                    setTimeout(() => {
                        assert.equal(mkdir.callCount, 1);
                        assert.equal(mkdir.firstCall.args[0], path.join(os.tmpdir(), Sender.TEMPDIR_PREFIX + "key"));
                        assert.equal(writeFile.callCount, 1);
                        assert.equal(
                            path.dirname(writeFile.firstCall.args[0]),
                            path.join(os.tmpdir(), Sender.TEMPDIR_PREFIX + "key"));
                        assert.equal(writeFile.firstCall.args[2].mode, 0o600, "File must not have weak permissions");
                        done();
                    }, 100);
                }
            });
        });

        it("does not store data when limit is below directory size", (done) => {
            var client = new AppInsights.TelemetryClient("key");
            client.channel.setUseDiskRetryCaching(true, null, 10); // 10 bytes is less than synthetic directory size (see file size in stat mock)

            client.trackEvent({ name: "test event" });

            client.flush({
                callback: (response: any) => {
                    // yield for the caching behavior
                    setImmediate(() => {
                        assert(writeFile.callCount === 0);
                        done();
                    });
                }
            });
        });

        it("checks for files when connection is back online", (done) => {
            var client = new AppInsights.TelemetryClient("key");
            client.channel.setUseDiskRetryCaching(true, 0);
            client.trackEvent({ name: "test event" });
            client.flush({
                callback: (response: any) => {
                    // yield for the caching behavior
                    setImmediate(() => {
                        assert.equal(writeFile.callCount, 1);
                        interceptor.reply(200, breezeResponse);
                        client.trackEvent({ name: "test event" });
                        client.flush({
                            callback: (response: any) => {
                                // wait until sdk looks for offline files
                                setTimeout(() => {
                                    assert.equal(readdir.callCount, 2);
                                    assert.equal(readFile.callCount, 1);
                                    assert.equal(
                                        path.dirname(readFile.firstCall.args[0]),
                                        path.join(os.tmpdir(), Sender.TEMPDIR_PREFIX + "key"));
                                    done();
                                }, 100);
                            }
                        });
                    });
                }
            });
        });

        it("cache payload synchronously when process crashes", () => {
            var client = new AppInsights.TelemetryClient("key2");
            client.channel.setUseDiskRetryCaching(true);

            client.trackEvent({ name: "test event" });
            client.channel.triggerSend(true);

            assert(existsSync.callCount === 1);
            assert(writeFileSync.callCount === 1);
            assert.equal(spawnSync.callCount, os.type() === "Windows_NT" ? 1 : 0); // This is implicitly testing caching of ACL identity (otherwise call count would be 2 like it is the non-sync time)
            assert.equal(
                path.dirname(writeFileSync.firstCall.args[0]),
                path.join(os.tmpdir(), Sender.TEMPDIR_PREFIX + "key2"));
            assert.equal(writeFileSync.firstCall.args[2].mode, 0o600, "File must not have weak permissions");
        });

        it("use WindowsIdentity to get ACL identity when process crashes (ICACLS)", () => {
            var client = new AppInsights.TelemetryClient("key22");
            client.channel.setUseDiskRetryCaching(true);
            var origICACLS = FileAccessControl.USE_ICACLS;
            FileAccessControl.USE_ICACLS = true; // Simulate ICACLS environment even on *nix

            // Clear ICACLS caches for test purposes
            FileAccessControl["ACLED_DIRECTORIES"] = {};
            FileAccessControl["ACL_IDENTITY"] = null;

            client.trackEvent({ name: "test event" });
            client.channel.triggerSend(true);

            // First external call should be to powershell to query WindowsIdentity
            assert(spawnSync.firstCall.args[0].indexOf('powershell.exe'));
            assert.equal(spawnSync.firstCall.args[1][0], "-Command");
            assert.equal(spawnSync.firstCall.args[1][1], "[System.Security.Principal.WindowsIdentity]::GetCurrent().Name");
            assert.equal(FileAccessControl["ACL_IDENTITY"], 'stdoutmock');

            // Next call should be to ICACLS (with the acquired identity)
            assert(spawnSync.lastCall.args[0].indexOf('icacls.exe'));
            assert.equal(spawnSync.lastCall.args[1][3], "/grant");
            assert.equal(spawnSync.lastCall.args[1][4], "stdoutmock:(OI)(CI)F");

            FileAccessControl.USE_ICACLS = origICACLS;
        });

        it("refuses to cache payload when process crashes if ICACLS fails", () => {
            spawnSync.restore();
            var tempSpawnSync = sandbox.stub(child_process, 'spawnSync').returns({ status: 2000 });
            var client = new AppInsights.TelemetryClient("key3"); // avoid icacls cache by making key unique
            client.channel.setUseDiskRetryCaching(true);
            var origICACLS = FileAccessControl.USE_ICACLS;
            FileAccessControl.USE_ICACLS = true; // Simulate ICACLS environment even on *nix

            client.trackEvent({ name: "test event" });
            client.channel.triggerSend(true);

            assert(existsSync.callCount === 1);
            assert(writeFileSync.callCount === 0);

            if (child_process.spawnSync) {
                assert.equal(tempSpawnSync.callCount, 1);
                FileAccessControl.USE_ICACLS = origICACLS;
            }
        });
    });

    describe("Heartbeat metrics for VM", () => {
        beforeEach(() => {
            JsonConfig["_instance"] = undefined;
        });

        afterEach(() => {
            sandbox.restore();
        });

        it("should collect correct VM information from JSON response", (done) => {
            // set up stub
            const vmDataJSON = `{
                "vmId": "1",
                "subscriptionId": "2",
                "osType": "Windows_NT"
            }`;
            var stub: sinon.SinonStub = sandbox.stub(http, "request", (options: any, callback: any) => {
                var req = new fakeRequest(false, "http://169.254.169.254", vmDataJSON);
                req.on("end", callback);
                return req;
            });

            // set up sdk
            const client = new TelemetryClient("key");
            const heartbeat: HeartBeat = new HeartBeat(client);
            heartbeat.enable(true);
            HeartBeat.INSTANCE.enable(true);
            const trackMetricStub = sandbox.stub(heartbeat["_client"], "trackMetric");

            heartbeat["trackHeartBeat"](client.config, () => {
                assert.equal(trackMetricStub.callCount, 1, "should call trackMetric for the VM heartbeat metric");
                assert.equal(trackMetricStub.args[0][0].name, "HeartBeat", "should use correct name for heartbeat metric");
                assert.equal(trackMetricStub.args[0][0].value, 0, "value should be 0");
                const keys = Object.keys(trackMetricStub.args[0][0].properties);
                assert.equal(keys.length, 5, "should have 4 kv pairs added when resource type is VM");
                assert.equal(keys[0], "sdk", "sdk should be added as a key");
                assert.equal(keys[1], "osType", "osType should be added as a key");
                assert.equal(keys[2], "azInst_vmId", "azInst_vmId should be added as a key");
                assert.equal(keys[3], "azInst_subscriptionId", "azInst_subscriptionId should be added as a key");
                assert.equal(keys[4], "azInst_osType", "azInst_osType should be added as a key");

                const properties = trackMetricStub.args[0][0].properties;
                assert.equal(properties["sdk"], Context.sdkVersion, "sdk version should be read from Context");
                assert.equal(properties["osType"], os.type(), "osType should be read from os library");
                assert.equal(properties["azInst_vmId"], "1", "azInst_vmId should be read from response");
                assert.equal(properties["azInst_subscriptionId"], "2", "azInst_subscriptionId should be read from response");
                assert.equal(properties["azInst_osType"], "Windows_NT", "azInst_osType should be read from response");
                done();
            });
        });

        it("should only send name and value properties for heartbeat metric when get VM request fails", (done) => {
            // set up stub
            var stub: sinon.SinonStub = sandbox.stub(http, "request", (options: any, callback: any) => {
                var req = new fakeRequest(true, "http://169.254.169.254");
                return req;
            });

            // set up sdk
            const client = new TelemetryClient("key");
            const heartbeat: HeartBeat = new HeartBeat(client);
            heartbeat.enable(true);
            HeartBeat.INSTANCE.enable(true);
            const trackMetricStub = sandbox.stub(heartbeat["_client"], "trackMetric");

            heartbeat["trackHeartBeat"](client.config, () => {
                assert.equal(trackMetricStub.callCount, 1, "should call trackMetric as heartbeat metric");
                assert.equal(trackMetricStub.args[0][0].name, "HeartBeat", "should use correct name for heartbeat metric");
                assert.equal(trackMetricStub.args[0][0].value, 0, "value should be 0");
                const keys = Object.keys(trackMetricStub.args[0][0].properties);
                assert.equal(keys.length, 2, "should have 2 kv pairs added when resource type is not web app, not function app, not VM");
                assert.equal(keys[0], "sdk", "sdk should be added as a key");
                assert.equal(keys[1], "osType", "osType should be added as a key");

                const properties = trackMetricStub.args[0][0].properties;
                assert.equal(properties["sdk"], Context.sdkVersion, "sdk version should be read from Context");
                assert.equal(properties["osType"], os.type(), "osType should be read from os library");
                done();
            });
        });
    });
});
