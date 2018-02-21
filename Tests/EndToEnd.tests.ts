import http = require("http");
import https = require("https");
import assert = require("assert");
import path = require("path")
import os = require("os")
import fs = require('fs');
import sinon = require("sinon");
import events = require("events");
import child_process = require("child_process");
import AppInsights = require("../applicationinsights");
import Sender = require("../Library/Sender");
import { EventEmitter } from "events";

/**
 * A fake response class that passes by default
 */
class fakeResponse {
    private callbacks: { [event: string]: (data?: any) => void } = Object.create(null);
    public setEncoding(): void { };
    public statusCode: number;

    constructor(private passImmediately: boolean = true) { }

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

    public pass(test = false): void {
        this.callbacks["data"] ? this.callbacks["data"]("data") : null;
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

    constructor(private failImmediatly: boolean = true, public url: string = undefined) { }

    public on(event: string, callback: Function) {
        this.callbacks[event] = callback;
        if (event === "error" && this.failImmediatly) {
            setImmediate(() => this.fail());
        }
    }

    public fail(): void {
        this.callbacks["error"] ? this.callbacks["error"]() : null;
    }

    public end(): void {
        this.callbacks["end"] ? this.callbacks["end"](new fakeResponse(true)) : null;
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

    describe("Basic usage", () => {
        var sandbox: sinon.SinonSandbox;

        beforeEach(() => {
            sandbox = sinon.sandbox.create();
            this.request = sandbox.stub(https, "request", (options: any, callback: any) => {
                var req = new fakeRequest(false);
                req.on("end", callback);
                return req;
            });
        });

        afterEach(() => {
            // Dispose the default app insights client and auto collectors so that they can be reconfigured
            // cleanly for each test
            AppInsights.dispose();
            sandbox.restore();
        });

        it("should send telemetry", (done) => {
            var client = new AppInsights.TelemetryClient("iKey");
            client.trackEvent({ name: "test event" });
            client.trackException({ exception: new Error("test error") });
            client.trackMetric({ name: "test metric", value: 3 });
            client.trackTrace({ message: "test trace" });
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
            this.request.restore();
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
            this.request.restore();
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
    });

    describe("Disk retry mode", () => {
        var CorrelationIdManager = require("../Library/CorrelationIdManager");
        var cidStub: sinon.SinonStub = null;
        var writeFile: sinon.SinonStub;
        var writeFileSync: sinon.SinonStub;
        var readFile: sinon.SinonStub;
        var lstat: sinon.SinonStub;
        var mkdir: sinon.SinonStub;
        var spawn: sinon.SinonStub;
        var spawnSync: sinon.SinonStub;

        beforeEach(() => {
            AppInsights.defaultClient = undefined;
            cidStub = sinon.stub(CorrelationIdManager, 'queryCorrelationId'); // TODO: Fix method of stubbing requests to allow CID to be part of E2E tests
            this.request = sinon.stub(https, 'request');
            writeFile = sinon.stub(fs, 'writeFile');
            writeFileSync = sinon.stub(fs, 'writeFileSync');
            this.exists = sinon.stub(fs, 'exists').yields(true);
            this.existsSync = sinon.stub(fs, 'existsSync').returns(true);
            this.readdir = sinon.stub(fs, 'readdir').yields(null, ['1.ai.json']);
            this.readdirSync = sinon.stub(fs, 'readdirSync').returns(['1.ai.json']);
            this.stat = sinon.stub(fs, 'stat').yields(null, {isFile: () => true, size: 8000});
            this.statSync = sinon.stub(fs, 'statSync').returns({isFile: () => true, size: 8000});
            lstat = sinon.stub(fs, 'lstat').yields(null, {isDirectory: () => true});
            mkdir = sinon.stub(fs, 'mkdir').yields(null);
            this.mkdirSync = sinon.stub(fs, 'mkdirSync').returns(null);
            readFile = sinon.stub(fs, 'readFile').yields(null, '');
            spawn = sinon.stub(child_process, 'spawn').returns({
                on: (type: string, cb: any) => {
                    if (type == 'close') {
                        cb(0);
                    }
                }
            });
            if (child_process.spawnSync) {
                spawnSync = sinon.stub(child_process, 'spawnSync').returns({status: 0});
            }
        });

        afterEach(() => {
            cidStub.restore();
            this.request.restore();
            writeFile.restore();
            this.exists.restore();
            this.readdir.restore();
            readFile.restore();
            writeFileSync.restore();
            this.existsSync.restore();
            this.stat.restore();
            lstat.restore();
            mkdir.restore();
            this.mkdirSync.restore();
            this.readdirSync.restore();
            this.statSync.restore();
            spawn.restore();
            if (child_process.spawnSync) {
                spawnSync.restore();
            }
        });

        it("disabled by default for new clients", (done) => {
            var req = new fakeRequest();

            var client = new AppInsights.TelemetryClient("key");

            client.trackEvent({ name: "test event" });

            this.request.returns(req);

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
            var req = new fakeRequest();

            AppInsights.setup("key").start();
            var client = AppInsights.defaultClient;

            client.trackEvent({ name: "test event" });

            this.request.returns(req);

            client.flush({
                callback: (response: any) => {
                    // yield for the caching behavior
                    setImmediate(() => {
                        assert.equal(writeFile.callCount, 1);
                        assert.equal(spawn.callCount, os.type() === "Windows_NT" ? 1 : 0);
                        done();
                    });
                }
            });
        });

        it("stores data to disk when enabled", (done) => {
            var req = new fakeRequest();

            var client = new AppInsights.TelemetryClient("key");
            client.channel.setUseDiskRetryCaching(true);

            client.trackEvent({ name: "test event" });

            this.request.returns(req);

            client.flush({
                callback: (response: any) => {
                    // yield for the caching behavior
                    setImmediate(() => {
                        assert(writeFile.callCount === 1);
                        assert.equal(
                            path.dirname(writeFile.firstCall.args[0]),
                            path.join(os.tmpdir(), Sender.TEMPDIR_PREFIX + "key"));
                        assert.equal(writeFile.firstCall.args[2].mode, 0o600, "File must not have weak permissions");
                        assert.equal(spawn.callCount, 0); // Should always be 0 because of caching after first call to ICACLS
                        done();
                    });
                }
            });
        });

        it("refuses to store data if ICACLS fails", (done) => {
            spawn.restore();
            var tempSpawn = sinon.stub(child_process, 'spawn').returns({
                on: (type: string, cb: any) => {
                    if (type == 'close') {
                        cb(2000); // return non-zero status code
                    }
                }
            });

            var req = new fakeRequest();

            var client = new AppInsights.TelemetryClient("uniquekey");
            client.channel.setUseDiskRetryCaching(true);
            var origICACLS = (<any>client.channel._sender.constructor).USE_ICACLS;
            (<any>client.channel._sender.constructor).USE_ICACLS = true; // Simulate ICACLS environment even on *nix

            client.trackEvent({ name: "test event" });

            this.request.returns(req);

            client.flush({
                callback: (response: any) => {
                    // yield for the caching behavior
                    setImmediate(() => {
                        assert(writeFile.callCount === 0);
                        assert.equal(tempSpawn.callCount, 1);

                        tempSpawn.restore();
                        (<any>client.channel._sender.constructor).USE_ICACLS = origICACLS;
                        done();
                    });
                }
            });
        });

        it("creates directory when nonexistent", (done) => {
            lstat.restore();
            var tempLstat = sinon.stub(fs, 'lstat').yields({code: "ENOENT"}, null);

            var req = new fakeRequest();

            var client = new AppInsights.TelemetryClient("key");
            client.channel.setUseDiskRetryCaching(true);

            client.trackEvent({ name: "test event" });

            this.request.returns(req);

            client.flush({
                callback: (response: any) => {
                    setImmediate(() => {
                        assert.equal(mkdir.callCount, 1);
                        assert.equal(mkdir.firstCall.args[0], path.join(os.tmpdir(), Sender.TEMPDIR_PREFIX + "key"));
                        assert.equal(writeFile.callCount, 1);
                        assert.equal(
                            path.dirname(writeFile.firstCall.args[0]),
                            path.join(os.tmpdir(), Sender.TEMPDIR_PREFIX + "key"));
                        assert.equal(writeFile.firstCall.args[2].mode, 0o600, "File must not have weak permissions");
                        
                        tempLstat.restore();
                        done();
                    });
                }
            });
        });

        it("does not store data when limit is below directory size", (done) => {
            var req = new fakeRequest();

            var client = new AppInsights.TelemetryClient("key");
            client.channel.setUseDiskRetryCaching(true, null, 10); // 10 bytes is less than synthetic directory size (see file size in stat mock)

            client.trackEvent({ name: "test event" });

            this.request.returns(req);

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
            var req = new fakeRequest(false);
            var res = new fakeResponse();
            res.statusCode = 200;

            var client = new AppInsights.TelemetryClient("key");
            client.channel.setUseDiskRetryCaching(true, 0);

            client.trackEvent({ name: "test event" });

            this.request.returns(req);
            this.request.yields(res);

            client.flush({
                callback: (response: any) => {
                    // wait until sdk looks for offline files
                    setTimeout(() => {
                        assert(this.readdir.callCount === 1);
                        assert(readFile.callCount === 1);
                        assert.equal(
                            path.dirname(readFile.firstCall.args[0]),
                            path.join(os.tmpdir(), Sender.TEMPDIR_PREFIX + "key"));
                        done();
                    }, 10);
                }
            });
        });

        it("cache payload synchronously when process crashes (Node >= 0.11.12)", () => {
            var nodeVer = process.versions.node.split(".");
            if (parseInt(nodeVer[0]) > 0 || parseInt(nodeVer[1]) > 11 || (parseInt(nodeVer[1]) == 11) && parseInt(nodeVer[2]) > 11) {
                var req = new fakeRequest(true);

                var client = new AppInsights.TelemetryClient("key2");
                client.channel.setUseDiskRetryCaching(true);

                client.trackEvent({ name: "test event" });

                this.request.returns(req);

                client.channel.triggerSend(true);

                assert(this.existsSync.callCount === 1);
                assert(writeFileSync.callCount === 1);
                assert.equal(spawnSync.callCount, os.type() === "Windows_NT" ? 1 : 0);
                assert.equal(
                    path.dirname(writeFileSync.firstCall.args[0]),
                    path.join(os.tmpdir(), Sender.TEMPDIR_PREFIX + "key2"));
                assert.equal(writeFileSync.firstCall.args[2].mode, 0o600, "File must not have weak permissions");
            }
        });

        it("cache payload synchronously when process crashes (Node < 0.11.12, ICACLS)", () => {
            var nodeVer = process.versions.node.split(".");
            if (!(parseInt(nodeVer[0]) > 0 || parseInt(nodeVer[1]) > 11 || (parseInt(nodeVer[1]) == 11) && parseInt(nodeVer[2]) > 11)) {
                var req = new fakeRequest(true);

                var client = new AppInsights.TelemetryClient("key22");
                client.channel.setUseDiskRetryCaching(true);
                var origICACLS = (<any>client.channel._sender.constructor).USE_ICACLS;
                (<any>client.channel._sender.constructor).USE_ICACLS = true; // Simulate ICACLS environment even on *nix

                client.trackEvent({ name: "test event" });

                this.request.returns(req);

                client.channel.triggerSend(true);

                assert(this.existsSync.callCount === 1);
                assert(writeFileSync.callCount === 0);
                (<any>client.channel._sender.constructor).USE_ICACLS = origICACLS;
            }
        });

        it("cache payload synchronously when process crashes (Node < 0.11.12, Non-ICACLS)", () => {
            var nodeVer = process.versions.node.split(".");
            if (!(parseInt(nodeVer[0]) > 0 || parseInt(nodeVer[1]) > 11 || (parseInt(nodeVer[1]) == 11) && parseInt(nodeVer[2]) > 11)) {
                var req = new fakeRequest(true);

                var client = new AppInsights.TelemetryClient("key23");
                client.channel.setUseDiskRetryCaching(true);
                var origICACLS = (<any>client.channel._sender.constructor).USE_ICACLS;
                (<any>client.channel._sender.constructor).USE_ICACLS = false; // Simulate Non-ICACLS environment even on Windows

                client.trackEvent({ name: "test event" });

                this.request.returns(req);

                client.channel.triggerSend(true);

                assert(this.existsSync.callCount === 1);
                assert(writeFileSync.callCount === 1);
                assert.equal(
                    path.dirname(writeFileSync.firstCall.args[0]),
                    path.join(os.tmpdir(), Sender.TEMPDIR_PREFIX + "key23"));
                assert.equal(writeFileSync.firstCall.args[2].mode, 0o600, "File must not have weak permissions");
            }
        });

        it("refuses to cache payload when process crashes if ICACLS fails", () => {
            if (child_process.spawnSync) { // Doesn't exist in Node < 0.11.12
                spawnSync.restore();
                var tempSpawnSync = sinon.stub(child_process, 'spawnSync').returns({status: 2000});
            }

            var req = new fakeRequest(true);

            var client = new AppInsights.TelemetryClient("key3"); // avoid icacls cache by making key unique
            client.channel.setUseDiskRetryCaching(true);
            var origICACLS = (<any>client.channel._sender.constructor).USE_ICACLS;
            (<any>client.channel._sender.constructor).USE_ICACLS = true; // Simulate ICACLS environment even on *nix

            client.trackEvent({ name: "test event" });

            this.request.returns(req);

            client.channel.triggerSend(true);

            assert(this.existsSync.callCount === 1);
            assert(writeFileSync.callCount === 0);

            if (child_process.spawnSync) {
                assert.equal(tempSpawnSync.callCount, 1);

                (<any>client.channel._sender.constructor).USE_ICACLS = origICACLS;
                tempSpawnSync.restore();
            }
        });
    });
});
