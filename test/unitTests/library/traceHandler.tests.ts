import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import * as sinon from "sinon";
import { ExportResultCode } from "@opentelemetry/core";

import { TraceHandler, MetricHandler } from "../../../src/library/handlers/";
import { Config } from "../../../src/library/configuration";
import { Instrumentation } from "@opentelemetry/instrumentation";
import { HttpInstrumentationConfig } from "@opentelemetry/instrumentation-http";

describe("Library/TraceHandler", () => {
    let http: any = null;
    let https: any = null;
    let sandbox: sinon.SinonSandbox;
    let _config: Config;

    before(() => {
        _config = new Config();
        _config.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;";
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("#Instrumentation Enablement", () => {
        it("AzureHttpMetricsInstrumentation", () => {
            _config.enableAutoCollectPerformance = true;
            let metricHandler = new MetricHandler(_config);
            let handler = new TraceHandler(_config, metricHandler);
            handler.start();
            let found = false;
            handler["_instrumentations"].forEach((instrumentation: Instrumentation) => {
                if (instrumentation.instrumentationName == "AzureHttpMetricsInstrumentation") {
                    found = true;
                }
            });
            assert.ok(found, "AzureHttpMetricsInstrumentation not added");
        });
    });

    describe("#autoCollection of HTTP/HTTPS requests", () => {
        let exportStub: sinon.SinonStub;
        let handler: TraceHandler = null;
        let metricHandler: MetricHandler = null;
        let mockHttpServer: any;
        let mockHttpsServer: any;
        let mockHttpServerPort = 0;
        let mockHttpsServerPort = 0;

        before(() => {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
            let httpConfig: HttpInstrumentationConfig = {
                enabled: true,
            };
            _config.instrumentations.http = httpConfig;
            metricHandler = new MetricHandler(_config);
            handler = new TraceHandler(_config, metricHandler);
            exportStub = sinon
                .stub(handler["_exporter"], "export")
                .callsFake((spans: any, resultCallback: any) => {
                    return new Promise((resolve, reject) => {
                        resultCallback({
                            code: ExportResultCode.SUCCESS,
                        });
                        resolve();
                    });
                });
            handler.start();
            // Load Http modules, HTTP instrumentation hook will be created in OpenTelemetry
            http = require("http") as any;
            https = require("https") as any;
            createMockServers();
        });

        beforeEach(() => {
            handler.disableInstrumentations();
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
                res.setHeader("content-type", "application/json");
                res.write(
                    JSON.stringify({
                        success: true,
                    })
                );
                res.end();
            });
            mockHttpsServer = https.createServer(
                {
                    key: fs.readFileSync(
                        path.join(__dirname, "../../../../test/", "certs", "server-key.pem")
                    ),
                    cert: fs.readFileSync(
                        path.join(__dirname, "../../../../test/", "certs", "server-cert.pem")
                    ),
                },
                (req: any, res: any) => {
                    res.statusCode = 200;
                    res.setHeader("content-type", "application/json");
                    res.write(
                        JSON.stringify({
                            success: true,
                        })
                    );
                    res.end();
                }
            );
            mockHttpServer.listen(0, () => {
                const addr = mockHttpServer.address();
                if (addr == null) {
                    new Error("unexpected addr null");
                    return;
                }
                if (typeof addr === "string") {
                    new Error(`unexpected addr ${addr}`);
                    return;
                }
                if (addr.port <= 0) {
                    new Error("Could not get port");
                    return;
                }
                mockHttpServerPort = addr.port;
            });
            mockHttpsServer.listen(0, () => {
                const addr = mockHttpsServer.address();
                if (addr == null) {
                    new Error("unexpected addr null");
                    return;
                }
                if (typeof addr === "string") {
                    new Error(`unexpected addr ${addr}`);
                    return;
                }
                if (addr.port <= 0) {
                    new Error("Could not get port");
                    return;
                }
                mockHttpsServerPort = addr.port;
            });
        }

        async function makeHttpRequest(isHttps: boolean): Promise<void> {
            const options = {
                hostname: "localhost",
                port: isHttps ? mockHttpsServerPort : mockHttpServerPort,
                path: "/test",
                method: "GET",
            };
            if (isHttps) {
                return new Promise((resolve, reject) => {
                    const req = https.request(options, (res: any) => {
                        res.on("data", function () {});
                        res.on("end", () => {
                            resolve();
                        });
                    });
                    req.on("error", (error: Error) => {
                        reject(error);
                    });
                    req.end();
                });
            } else {
                return new Promise((resolve, reject) => {
                    const req = http.request(options, (res: any) => {
                        res.on("data", function () {});
                        res.on("end", () => {
                            resolve();
                        });
                    });
                    req.on("error", (error: Error) => {
                        reject(error);
                    });
                    req.end();
                });
            }
        }

        it("http outgoing/incoming requests", (done) => {
            handler.start();
            makeHttpRequest(false)
                .then(() => {
                    handler
                        .flush()
                        .then(() => {
                            assert.ok(exportStub.calledOnce, "Export called");
                            let spans = exportStub.args[0][0];
                            assert.equal(spans.length, 2);
                            // Incoming request
                            assert.equal(spans[0].name, "HTTP GET");
                            assert.equal(
                                spans[0].instrumentationLibrary.name,
                                "@opentelemetry/instrumentation-http"
                            );
                            assert.equal(spans[0].kind, 1, "Span Kind");
                            assert.equal(spans[0].status.code, 0, "Span Success"); // Success
                            assert.ok(spans[0].startTime);
                            assert.ok(spans[0].endTime);
                            assert.equal(
                                spans[0].attributes["http.host"],
                                "localhost:" + mockHttpServerPort
                            );
                            assert.equal(spans[0].attributes["http.method"], "GET");
                            assert.equal(spans[0].attributes["http.status_code"], "200");
                            assert.equal(spans[0].attributes["http.status_text"], "OK");
                            assert.equal(spans[0].attributes["http.target"], "/test");
                            assert.equal(
                                spans[0].attributes["http.url"],
                                "http://localhost:" + mockHttpServerPort + "/test"
                            );
                            assert.equal(spans[0].attributes["net.host.name"], "localhost");
                            assert.equal(spans[0].attributes["net.host.port"], mockHttpServerPort);
                            // Outgoing request
                            assert.equal(spans[1].name, "HTTP GET");
                            assert.equal(
                                spans[1].instrumentationLibrary.name,
                                "@opentelemetry/instrumentation-http"
                            );
                            assert.equal(spans[1].kind, 2, "Span Kind");
                            assert.equal(spans[1].status.code, 0, "Span Success"); // Success
                            assert.ok(spans[1].startTime);
                            assert.ok(spans[1].endTime);
                            assert.equal(
                                spans[1].attributes["http.host"],
                                "localhost:" + mockHttpServerPort
                            );
                            assert.equal(spans[1].attributes["http.method"], "GET");
                            assert.equal(spans[1].attributes["http.status_code"], "200");
                            assert.equal(spans[1].attributes["http.status_text"], "OK");
                            assert.equal(spans[1].attributes["http.target"], "/test");
                            assert.equal(
                                spans[1].attributes["http.url"],
                                "http://localhost:" + mockHttpServerPort + "/test"
                            );
                            assert.equal(spans[1].attributes["net.peer.name"], "localhost");
                            assert.equal(spans[1].attributes["net.peer.port"], mockHttpServerPort);

                            assert.equal(
                                spans[0]["_spanContext"]["traceId"],
                                spans[1]["_spanContext"]["traceId"]
                            );
                            assert.notEqual(
                                spans[0]["_spanContext"]["spanId"],
                                spans[1]["_spanContext"]["spanId"]
                            );
                            done();
                        })
                        .catch((error) => {
                            done(error);
                        });
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("https outgoing/incoming requests", (done) => {
            handler.start();
            makeHttpRequest(true)
                .then(() => {
                    handler
                        .flush()
                        .then(() => {
                            assert.ok(exportStub.calledOnce, "Export called");
                            let spans = exportStub.args[0][0];
                            assert.equal(spans.length, 2);
                            // Incoming request
                            assert.equal(spans[0].name, "HTTPS GET");
                            assert.equal(
                                spans[0].instrumentationLibrary.name,
                                "@opentelemetry/instrumentation-http"
                            );
                            assert.equal(spans[0].kind, 1, "Span Kind");
                            assert.equal(spans[0].status.code, 0, "Span Success"); // Success
                            assert.ok(spans[0].startTime);
                            assert.ok(spans[0].endTime);
                            assert.equal(
                                spans[0].attributes["http.host"],
                                "localhost:" + mockHttpsServerPort
                            );
                            assert.equal(spans[0].attributes["http.method"], "GET");
                            assert.equal(spans[0].attributes["http.status_code"], "200");
                            assert.equal(spans[0].attributes["http.status_text"], "OK");
                            assert.equal(spans[0].attributes["http.target"], "/test");
                            assert.equal(
                                spans[0].attributes["http.url"],
                                "https://localhost:" + mockHttpsServerPort + "/test"
                            );
                            assert.equal(spans[0].attributes["net.host.name"], "localhost");
                            assert.equal(spans[0].attributes["net.host.port"], mockHttpsServerPort);
                            // Outgoing request
                            assert.equal(spans[1].name, "HTTPS GET");
                            assert.equal(
                                spans[1].instrumentationLibrary.name,
                                "@opentelemetry/instrumentation-http"
                            );
                            assert.equal(spans[1].kind, 2, "Span Kind");
                            assert.equal(spans[1].status.code, 0, "Span Success"); // Success
                            assert.ok(spans[1].startTime);
                            assert.ok(spans[1].endTime);
                            assert.equal(
                                spans[1].attributes["http.host"],
                                "localhost:" + mockHttpsServerPort
                            );
                            assert.equal(spans[1].attributes["http.method"], "GET");
                            assert.equal(spans[1].attributes["http.status_code"], "200");
                            assert.equal(spans[1].attributes["http.status_text"], "OK");
                            assert.equal(spans[1].attributes["http.target"], "/test");
                            assert.equal(
                                spans[1].attributes["http.url"],
                                "https://localhost:" + mockHttpsServerPort + "/test"
                            );
                            assert.equal(spans[1].attributes["net.peer.name"], "localhost");
                            assert.equal(spans[1].attributes["net.peer.port"], mockHttpsServerPort);

                            assert.equal(
                                spans[0]["_spanContext"]["traceId"],
                                spans[1]["_spanContext"]["traceId"]
                            );
                            assert.notEqual(
                                spans[0]["_spanContext"]["spanId"],
                                spans[1]["_spanContext"]["spanId"]
                            );
                            done();
                        })
                        .catch((error) => {
                            done(error);
                        });
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("Span processing for pre aggregated metrics", (done) => {
            handler.start();
            metricHandler.getConfig().enableAutoCollectStandardMetrics = true;
            makeHttpRequest(false)
                .then(() => {
                    handler
                        .flush()
                        .then(() => {
                            assert.ok(exportStub.calledOnce, "Export called");
                            let spans = exportStub.args[0][0];
                            assert.equal(spans.length, 2);
                            // Incoming request
                            assert.equal(
                                spans[0].attributes["_MS.ProcessedByMetricExtractors"],
                                "(Name:'Requests', Ver:'1.1')"
                            );
                            // Outgoing request
                            assert.equal(
                                spans[1].attributes["_MS.ProcessedByMetricExtractors"],
                                "(Name:'Dependencies', Ver:'1.1')"
                            );
                            done();
                        })
                        .catch((error) => {
                            done(error);
                        });
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("should not track dependencies if configured off", (done) => {
            let httpConfig: HttpInstrumentationConfig = {
                enabled: true,
                ignoreOutgoingRequestHook: () => {
                    return true;
                },
            };
            handler["_httpInstrumentation"].setConfig(httpConfig);
            handler.start();
            makeHttpRequest(false)
                .then(() => {
                    handler
                        .flush()
                        .then(() => {
                            assert.ok(exportStub.calledOnce, "Export called");
                            let spans = exportStub.args[0][0];
                            assert.equal(spans.length, 1);
                            assert.equal(spans[0].kind, 1, "Span Kind"); // Incoming only
                            done();
                        })
                        .catch((error) => {
                            done(error);
                        });
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("should not track requests if configured off", (done) => {
            let httpConfig: HttpInstrumentationConfig = {
                enabled: true,
                ignoreIncomingRequestHook: () => {
                    return true;
                },
            };
            handler["_httpInstrumentation"].setConfig(httpConfig);
            handler.start();
            makeHttpRequest(false)
                .then(() => {
                    handler
                        .flush()
                        .then(() => {
                            assert.ok(exportStub.calledOnce, "Export called");
                            let spans = exportStub.args[0][0];
                            assert.equal(spans.length, 1);
                            assert.equal(spans[0].kind, 2, "Span Kind"); // Outgoing only
                            done();
                        })
                        .catch((error) => {
                            done(error);
                        });
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("http should not track if instrumentations are disabled", (done) => {
            handler.disableInstrumentations();
            makeHttpRequest(false)
                .then(() => {
                    makeHttpRequest(true)
                        .then(() => {
                            handler
                                .flush()
                                .then(() => {
                                    assert.ok(exportStub.notCalled, "Export not called");
                                    done();
                                })
                                .catch((error) => {
                                    done(error);
                                });
                        })
                        .catch((error) => {
                            done(error);
                        });
                })
                .catch((error) => {
                    done(error);
                });
        });
    });
});
