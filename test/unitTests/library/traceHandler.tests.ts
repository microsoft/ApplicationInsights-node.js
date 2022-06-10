import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import * as sinon from "sinon";
import { ExportResultCode } from "@opentelemetry/core";

import { TraceHandler, ResourceManager } from "../../../src/library/handlers/";
import { Config } from "../../../src/library/configuration";
import { DependencyTelemetry, RequestTelemetry } from "../../../src/declarations/contracts";


describe("Library/TraceHandlers", () => {
    let http: any = null;
    let https: any = null;
    let sandbox: sinon.SinonSandbox;
    let _config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
    const _context = new ResourceManager(_config);

    before(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    // describe("#autoCollect", () => {
    //     it("performance enablement during start", () => {
    //         _config.enableAutoCollectPerformance = true;
    //         let handler = new MetricHandler(_config, _context);
    //         let stub = sinon.stub(handler["_performance"], "enable");
    //         handler.start();
    //         assert.ok(stub.calledOnce, "Enable called");
    //         assert.equal(stub.args[0][0], true);
    //     });

    // });

    describe("#autoCollection of HTTP/HTTPS requests", () => {
        let exportStub: sinon.SinonStub;
        let handler: TraceHandler = null;
        let mockHttpServer: any;
        let mockHttpsServer: any;
        let mockHttpServerPort = 0;
        let mockHttpsServerPort = 0;

        before(() => {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            _config.enableAutoCollectDependencies = true;
            _config.enableAutoCollectRequests = true;
            handler = new TraceHandler(_config, _context);
            exportStub = sinon.stub(handler["_exporter"], "export").callsFake((spans: any, resultCallback: any) => {
                return new Promise((resolve, reject) => {
                    resultCallback({
                        code: ExportResultCode.SUCCESS
                    });
                    resolve();
                });
            });
            handler.start();
            // Load Http modules
            http = require("http") as any;
            https = require("https") as any;
            createMockServers();
        });

        afterEach(() => {
            exportStub.resetHistory();
        });

        after(() => {
            exportStub.restore();
            mockHttpServer.close();
            mockHttpsServer.close();
        });

        function createMockServers() {
            mockHttpServer = http.createServer((req: any, res: any) => {
                res.statusCode = 200;
                res.setHeader('content-type', 'application/json');
                res.write(
                    JSON.stringify({
                        success: true,
                    })
                );
                res.end();
            });
            mockHttpsServer = https.createServer({
                key: fs.readFileSync(
                    path.join(__dirname, '../../../../test/', 'certs', 'server-key.pem')
                ),
                cert: fs.readFileSync(
                    path.join(__dirname, '../../../../test/', 'certs', 'server-cert.pem')
                ),
            }, (req: any, res: any) => {
                res.statusCode = 200;
                res.setHeader('content-type', 'application/json');
                res.write(
                    JSON.stringify({
                        success: true,
                    })
                );
                res.end();
            });
            mockHttpServer.listen(0, () => {
                const addr = mockHttpServer.address();
                if (addr == null) {
                    new Error('unexpected addr null');
                    return;
                }
                if (typeof addr === 'string') {
                    new Error(`unexpected addr ${addr}`);
                    return;
                }
                if (addr.port <= 0) {
                    new Error('Could not get port');
                    return;
                }
                mockHttpServerPort = addr.port;
            });
            mockHttpsServer.listen(0, () => {
                const addr = mockHttpsServer.address();
                if (addr == null) {
                    new Error('unexpected addr null');
                    return;
                }
                if (typeof addr === 'string') {
                    new Error(`unexpected addr ${addr}`);
                    return;
                }
                if (addr.port <= 0) {
                    new Error('Could not get port');
                    return;
                }
                mockHttpsServerPort = addr.port;
            });
        }

        async function makeHttpRequest(isHttps: boolean): Promise<void> {
            const options = {
                hostname: 'localhost',
                port: isHttps ? mockHttpsServerPort : mockHttpServerPort,
                path: '/test',
                method: 'GET',
            };
            if (isHttps) {
                return new Promise((resolve, reject) => {
                    const req = https.request(options, (res: any) => {
                        res.on('data', function () {
                        });
                        res.on('end', () => {
                            resolve();
                        });
                    });
                    req.on('error', (error: Error) => {
                        reject(error);
                    });
                    req.end();
                });
            }
            else {
                return new Promise((resolve, reject) => {
                    const req = http.request(options, (res: any) => {
                        res.on('data', function () {
                        });
                        res.on('end', () => {
                            resolve();
                        });
                    });
                    req.on('error', (error: Error) => {
                        reject(error);
                    });
                    req.end();
                });
            }
        }

        it("http outgoing/incoming requests", (done) => {

            makeHttpRequest(false).then(() => {
                handler.flush().then(() => {
                    assert.ok(exportStub.calledOnce, "Export called");
                    let spans = exportStub.args[0][0];
                    assert.equal(spans.length, 2);
                    // Incoming request
                    assert.equal(spans[0].name, "HTTP GET");
                    assert.equal(spans[0].instrumentationLibrary.name, "@opentelemetry/instrumentation-http");
                    assert.equal(spans[0].kind, 1, "Span Kind");
                    assert.equal(spans[0].status.code, 0, "Span Success");// Success
                    assert.ok(spans[0].startTime);
                    assert.ok(spans[0].endTime);
                    assert.equal(spans[0].attributes["http.host"], "localhost:" + mockHttpServerPort);
                    assert.equal(spans[0].attributes["http.method"], "GET");
                    assert.equal(spans[0].attributes["http.status_code"], "200");
                    assert.equal(spans[0].attributes["http.status_text"], "OK");
                    assert.equal(spans[0].attributes["http.target"], "/test");
                    assert.equal(spans[0].attributes["http.url"], "http://localhost:" + mockHttpServerPort + "/test");
                    assert.equal(spans[0].attributes["net.host.name"], "localhost");
                    assert.equal(spans[0].attributes["net.host.port"], mockHttpServerPort);
                    // Outgoing request
                    assert.equal(spans[1].name, "HTTP GET");
                    assert.equal(spans[1].instrumentationLibrary.name, "@opentelemetry/instrumentation-http");
                    assert.equal(spans[1].kind, 2, "Span Kind");
                    assert.equal(spans[1].status.code, 0, "Span Success");// Success
                    assert.ok(spans[1].startTime);
                    assert.ok(spans[1].endTime);
                    assert.equal(spans[1].attributes["http.host"], "localhost:" + mockHttpServerPort);
                    assert.equal(spans[1].attributes["http.method"], "GET");
                    assert.equal(spans[1].attributes["http.status_code"], "200");
                    assert.equal(spans[1].attributes["http.status_text"], "OK");
                    assert.equal(spans[1].attributes["http.target"], "/test");
                    assert.equal(spans[1].attributes["http.url"], "http://localhost:" + mockHttpServerPort + "/test");
                    assert.equal(spans[1].attributes["net.peer.name"], "localhost");
                    assert.equal(spans[1].attributes["net.peer.port"], mockHttpServerPort);

                    assert.equal(spans[0]["_spanContext"]["traceId"], spans[1]["_spanContext"]["traceId"]);
                    assert.notEqual(spans[0]["_spanContext"]["spanId"], spans[1]["_spanContext"]["spanId"]);
                    done();
                }).catch((error) => {
                    done(error);
                });;
            }).catch((error) => {
                done(error);
            });;
        });

        it("https outgoing/incoming requests", (done) => {

            makeHttpRequest(true).then(() => {
                handler.flush().then(() => {
                    assert.ok(exportStub.calledOnce, "Export called");
                    let spans = exportStub.args[0][0];
                    assert.equal(spans.length, 2);
                    // Incoming request
                    assert.equal(spans[0].name, "HTTPS GET");
                    assert.equal(spans[0].instrumentationLibrary.name, "@opentelemetry/instrumentation-http");
                    assert.equal(spans[0].kind, 1, "Span Kind");
                    assert.equal(spans[0].status.code, 0, "Span Success");// Success
                    assert.ok(spans[0].startTime);
                    assert.ok(spans[0].endTime);
                    assert.equal(spans[0].attributes["http.host"], "localhost:" + mockHttpsServerPort);
                    assert.equal(spans[0].attributes["http.method"], "GET");
                    assert.equal(spans[0].attributes["http.status_code"], "200");
                    assert.equal(spans[0].attributes["http.status_text"], "OK");
                    assert.equal(spans[0].attributes["http.target"], "/test");
                    assert.equal(spans[0].attributes["http.url"], "https://localhost:" + mockHttpsServerPort + "/test");
                    assert.equal(spans[0].attributes["net.host.name"], "localhost");
                    assert.equal(spans[0].attributes["net.host.port"], mockHttpsServerPort);
                    // Outgoing request
                    assert.equal(spans[1].name, "HTTPS GET");
                    assert.equal(spans[1].instrumentationLibrary.name, "@opentelemetry/instrumentation-http");
                    assert.equal(spans[1].kind, 2, "Span Kind");
                    assert.equal(spans[1].status.code, 0, "Span Success");// Success
                    assert.ok(spans[1].startTime);
                    assert.ok(spans[1].endTime);
                    assert.equal(spans[1].attributes["http.host"], "localhost:" + mockHttpsServerPort);
                    assert.equal(spans[1].attributes["http.method"], "GET");
                    assert.equal(spans[1].attributes["http.status_code"], "200");
                    assert.equal(spans[1].attributes["http.status_text"], "OK");
                    assert.equal(spans[1].attributes["http.target"], "/test");
                    assert.equal(spans[1].attributes["http.url"], "https://localhost:" + mockHttpsServerPort + "/test");
                    assert.equal(spans[1].attributes["net.peer.name"], "localhost");
                    assert.equal(spans[1].attributes["net.peer.port"], mockHttpsServerPort);

                    assert.equal(spans[0]["_spanContext"]["traceId"], spans[1]["_spanContext"]["traceId"]);
                    assert.notEqual(spans[0]["_spanContext"]["spanId"], spans[1]["_spanContext"]["spanId"]);
                    done();
                }).catch((error) => {
                    done(error);
                });;
            }).catch((error) => {
                done(error);
            });;
        });

        it("should not track dependencies if configured off", (done) => {
            handler["_config"].enableAutoCollectDependencies = false;
            handler["_config"].enableAutoCollectRequests = true;
            makeHttpRequest(false).then(() => {
                handler.flush().then(() => {
                    assert.ok(exportStub.calledOnce, "Export called");
                    let spans = exportStub.args[0][0];
                    assert.equal(spans.length, 1);
                    assert.equal(spans[0].kind, 1, "Span Kind"); // Incoming only
                    done();
                }).catch((error) => {
                    done(error);
                });;
            }).catch((error) => {
                done(error);
            });;
        });

        it("should not track requests if configured off", (done) => {
            handler["_config"].enableAutoCollectDependencies = true;
            handler["_config"].enableAutoCollectRequests = false;
            makeHttpRequest(false).then(() => {
                handler.flush().then(() => {
                    assert.ok(exportStub.calledOnce, "Export called");
                    let spans = exportStub.args[0][0];
                    assert.equal(spans.length, 1);
                    assert.equal(spans[0].kind, 2, "Span Kind"); // Outgoing only
                    done();
                }).catch((error) => {
                    done(error);
                });;
            }).catch((error) => {
                done(error);
            });;
        });

        it("http should not track if instrumentations are disabled", (done) => {
            handler["_config"].enableAutoCollectDependencies = true;
            handler["_config"].enableAutoCollectRequests = true;
            handler.disableInstrumentations();
            makeHttpRequest(false).then(() => {
                makeHttpRequest(true).then(() => {
                    handler.flush().then(() => {
                        assert.ok(exportStub.notCalled, "Export not called");
                        done();
                    }).catch((error) => {
                        done(error);
                    });
                }).catch((error) => {
                    done(error);
                });;
            }).catch((error) => {
                done(error);
            });;

        });
    });
});
