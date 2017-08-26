import http = require("http");
import https = require("https");
import assert = require("assert");
import fs = require('fs');
import sinon = require("sinon");
import events = require("events");
import AppInsights = require("../applicationinsights");
import Sender = require("../Library/Sender");

/**
 * A fake response class that passes by default
 */
class fakeResponse {
    private callbacks: { [event: string]: (data?: any) => void } = Object.create(null);
    public setEncoding(): void { };
    public statusCode: number;

    constructor(private passImmediately: boolean = true) { }

    public on(event: string, callback: () => void) {
        this.callbacks[event] = callback;
        if (event == "end" && this.passImmediately) {
            this.pass();
        }
    }

    public once(event: string, callback: () => void) {
        this.callbacks[event] = callback;
        if (event == "end" && this.passImmediately) {
            this.pass();
        }
    }

    public pass(): void {
        this.statusCode = 200;
        this.callbacks["data"] ? this.callbacks["data"]("data") : null;
        this.callbacks["end"] ? this.callbacks["end"]() : null;
        this.callbacks["finish"] ? this.callbacks["finish"]() : null;
    }
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
        response.pass();
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
            var client = AppInsights.getClient("iKey");
            client.trackEvent({ name: "test event" });
            client.trackException({ exception: new Error("test error") });
            client.trackMetric({ name: "test metric", value: 3 });
            client.trackTrace({ message: "test trace" });
            client.flush((response) => {
                assert.ok(response, "response should not be empty");
                done();
            });
        });

        it("should collect http request telemetry", (done) => {
            var fakeHttpSrv = new fakeHttpServer();
            sandbox.stub(http, 'createServer', (callback: (req: http.ServerRequest, res: http.ServerResponse) => void) => {
                fakeHttpSrv.setCallback(callback);
                return fakeHttpSrv;
            });

            sandbox.stub(http, 'get', (uri: string, callback: any) => {
                fakeHttpSrv.emitRequest(uri);
            });

            AppInsights
                .setup("ikey")
                .start();

            var server = http.createServer((req: http.ServerRequest, res: http.ServerResponse) => {
                setTimeout(() => {
                    AppInsights.client.flush((response) => {
                        assert.ok(response, "response should not be empty");
                        done();
                    });
                }, 10);
            });

            server.on("listening", () => {
                http.get("http://localhost:0/test", (response: http.ClientResponse) => { });
            });
            server.listen(0, "::");
        });

        it("should collect https request telemetry", (done) => {
            var fakeHttpsSrv = new fakeHttpsServer();
            sandbox.stub(https, 'createServer', (options: any, callback: (req: http.ServerRequest, res: http.ServerResponse) => void) => {
                fakeHttpsSrv.setCallback(callback);
                return fakeHttpsSrv;
            });

            sandbox.stub(https, 'get', (uri: string, callback: any) => {
                fakeHttpsSrv.emitRequest(uri);
            });

            AppInsights
                .setup("ikey")
                .start();

            var server = https.createServer(null, (req: http.ServerRequest, res: http.ServerResponse) => {
                setTimeout(() => {
                    AppInsights.client.flush((response) => {
                        assert.ok(response, "response should not be empty");
                        done();
                    });
                }, 10);
            });

            server.on("listening", () => {
                https.get("https://localhost:0/test", (response: http.ClientResponse) => { });
            });
            server.listen(0, "::");
        });
    });

    describe("Offline mode", () => {
        var AppInsights = require("../applicationinsights");
        var CorrelationIdManager = require("../Library/CorrelationIdManager");
        var cidStub: sinon.SinonStub = null;


        beforeEach(() => {
            AppInsights.client = undefined;
            cidStub = sinon.stub(CorrelationIdManager, 'queryCorrelationId'); // TODO: Fix method of stubbing requests to allow CID to be part of E2E tests
            this.request = sinon.stub(https, 'request');
            this.writeFile = sinon.stub(fs, 'writeFile');
            this.writeFileSync = sinon.stub(fs, 'writeFileSync');
            this.exists = sinon.stub(fs, 'exists').yields(true);
            this.existsSync = sinon.stub(fs, 'existsSync').returns(true);
            this.readdir = sinon.stub(fs, 'readdir').yields(null, ['1.ai.json']);
            this.readFile = sinon.stub(fs, 'readFile').yields(null, '');
        });

        afterEach(() => {
            cidStub.restore();
            this.request.restore();
            this.writeFile.restore();
            this.exists.restore();
            this.readdir.restore();
            this.readFile.restore();
            this.writeFileSync.restore();
            this.existsSync.restore();
        });

        it("disabled by default", (done) => {
            var req = new fakeRequest();

            var client = AppInsights.getClient("key");

            client.trackEvent({ name: "test event" });

            this.request.returns(req);

            client.flush((response: any) => {
                // yield for the caching behavior
                setImmediate(() => {
                    assert(this.writeFile.callCount === 0);
                    done();
                });
            });
        });

        it("stores data to disk when enabled", (done) => {
            var req = new fakeRequest();

            var client = AppInsights.getClient("key");
            client.channel.setOfflineMode(true);

            client.trackEvent({ name: "test event" });

            this.request.returns(req);

            client.flush((response: any) => {
                // yield for the caching behavior
                setImmediate(() => {
                    assert(this.writeFile.callCount === 1);
                    done();
                });
            });
        });

        it("checks for files when connection is back online", (done) => {
            var req = new fakeRequest(false);
            var res = new fakeResponse();
            res.statusCode = 200;

            var client = AppInsights.getClient("key");
            client.channel.setOfflineMode(true, 0);

            client.trackEvent({ name: "test event" });

            this.request.returns(req);
            this.request.yields(res);

            client.flush((response: any) => {
                // wait until sdk looks for offline files
                setTimeout(() => {
                    assert(this.readdir.callCount === 1);
                    assert(this.readFile.callCount === 1);
                    done();
                }, 10);
            });
        });

        it("cache payload synchronously when process crashes", () => {
            var req = new fakeRequest(true);

            var client = AppInsights.getClient("key");
            client.channel.setOfflineMode(true);

            client.trackEvent({ name: "test event" });

            this.request.returns(req);

            client.channel.triggerSend(true);

            assert(this.existsSync.callCount === 1);
            assert(this.writeFileSync.callCount === 1);
        });
    });
});
