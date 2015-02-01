import http = require("http");
import fs = require("fs");
import path = require("path");
import os = require("os");
import AppInsights = require("../applicationInsights");
import Sender = require("../Sender");
import TestHelper = require("./TestHelper");

var mock = require("node-mocks-http");

var prefix = "E2ETests_";

class E2ETests implements TestHelper.Tests {
    private _testHelper: TestHelper;

    constructor(testHelper: TestHelper) {
        this._testHelper = testHelper;
    }

    public register() {
        this._baseTests();
        this._apiTests();
        this._requestAutoCollection();
        this._cacheOnError();
    }

    /**
     * BVTs
     */
    private _baseTests() {
        var type = prefix + "baseTests";
        var name = "canInstantiate";
        this._testHelper.registerTest(type, name, () => {
            return !!this._getAi();
        });
    }

    /**
     * Pulic API tests
     */
    private _apiTests() {
        var type = prefix + "apiTests";
        var ai = this._getAi();

        var test = (method, arg1, arg2?) => {
            name = "appInsights API - " + method;
            var action = (name, arg1, arg2, callback: (any, TestResult) => void) => {
                return (callback: (any, TestResult) => void) => {
                    ai[method](arg1, arg2);
                    callback(null, {
                        type: type,
                        name: name,
                        result: true
                    });
                }
            };

            this._testHelper.registerTestAsync(type, name, action.apply(this, [name, arg1, arg2]));
        };

        test("trackEvent", "e2e test event");
        test("trackTrace", "e2e test trace");
        test("trackException", new Error("e2e test error"));
        test("trackMetric", "e2e test metric", 1);

        // expect 4 items to be accepted by the backend
        this._validateSender(ai, "checkApi", 4);
    }

    /**
     * Telemetry Object tests
     */
    private _requestAutoCollection() {
        var type = prefix + "autoCollectionTests";

        var ai = this._getAi();
        ai.trackAllHttpServerRequests();

        var test = (name: string, expectedCount: number, serverF: () => http.Server) => {
            this._validateSender(ai, name, expectedCount, () => {
                var server = serverF();

                // add listener to server after adding our handler
                server.addListener("request", (req: http.ServerRequest, res: http.ServerResponse) => {
                    if (req.url === "/" + encodeURIComponent(name + type)) {
                        res.end(type);
                    }
                });

                // send GET to mock server
                server.on("listening", () => {
                    http.get("http://" + server.address().address + ":" + server.address().port + "/" + name + type, (response) => {

                        var data = "";
                        response.on('data', (d) => data += d);
                        response.on('end', () => console.log(data));
                    });
                });
            });
        }

        test("httpServerNoLambda", 1, () => http.createServer().listen(0, "localhost"));
        test("httpServerWithLambda", 1, () => http.createServer(() => null).listen(0, "localhost"));
        test("httpServerPreRestoreShowsTwo", 2, () => http.createServer(() => ai.trackEvent("requestTestEvent")).listen(0, "localhost"));

        test("httpServerRestore", 1, () => {
            ai.restoreHttpServerRequests(); // restore and send an event (then check that only 1 item was sent)
            return http.createServer(() => ai.trackEvent("requestTestEvent")).listen(0, "localhost");
        });

        test("httpServerRestoreResume", 1, () => {
            ai.trackAllHttpServerRequests();
            return http.createServer(() => null).listen(0, "localhost")
        });
    }
    
    /**
     * Test cache on error option
     */
    private _cacheOnError() {
        var type = prefix + "cacheOnError";
        var tmpDir = path.join(os.tmpDir(), Sender.TEMPDIR);
        
        //configure App Insights with unreachable endpointUrl
        var faulty_ai = this._getAi({
            instrumentationKey: "",
            endpointUrl: "not a valid url",
            enableCacheOnError: true,
        });
        
        this._testHelper.registerTestAsync(type, "Test caching on disk",(callback) => {
            fs.readdir(tmpDir,(error, files_before) => {
                if (error) {
                    // direcotry might not exist
                    files_before = []; 
                }

                faulty_ai.trackEvent("event should be written to disk");
                
                setTimeout(() => {
                    fs.readdir(tmpDir,(error, files_after) => {
                        if (error) {
                            callback(null, {
                                type: type,
                                name: "Test caching on disk",
                                result: false
                            });
                        } else {
                            callback(null, {
                                type: type,
                                name: "Test caching on disk",
                                result: files_before.length < files_after.length
                            });
                        }
                    });
                }, 1500);
            });
        });
        
        //configure App Insights
        var ai = this._getAi({
            instrumentationKey: "",
            enableCacheOnError: true,
        });
        this._testHelper.registerTestAsync(type, "Test sending cached events on disk",(callback) => {
            fs.readdir(tmpDir,(error, files_before) => {
                if (error) {
                    callback(null, {
                        type: type,
                        name: "Test sending cahced events on disk",
                        result: false
                    });
                }
                
                // this test runs after the first test where file should exist on disk 
                if (files_before.length === 0) {
                    callback(null, {
                        type: type,
                        name: "Test sending cached events on disk",
                        result: true
                    });
                }
                
                // a sucessful post should trigger sending cached events 
                ai.trackEvent("test");

                setTimeout(() => {
                    fs.readdir(tmpDir,(error, files_after) => {
                        if (error) {
                            callback(null, {
                                type: type,
                                name: "Test sending cached events on disk",
                                result: false
                            });
                        } else {
                            callback(null, {
                                type: type,
                                name: "Test sending cached events on disk",
                                result: files_before.length > files_after.length
                            });
                        }
                    });
                }, 1500);
            });
        });
    }
    
    
    private _getAi(config?: AppInsights.IConfig) {
        config = config || {
            instrumentationKey: ""
        };
        
        config.maxBatchInterval = 0; // disables batching
        
        // load and configure application insights
        var ai = new AppInsights(config);

        return ai;
    }
    
    private _validateSender(ai: AppInsights, testName: string, expectedAcceptedItemCount: number, action?: () => void) {

        var type = prefix + "sender validation";
        var name = testName + expectedAcceptedItemCount + " request(s) were accepted";
        this._testHelper.registerTestAsync(type, name, (callback: (any, TestResults) => void) => {
            if (action) {
                action();
            }

            // validate success in sender
            var Sender = require("../Sender");
            var browserSender = ai.context._sender;
            var onSuccess = (response: string) => {
                callback(null, {
                    type: type,
                    name: name,
                    result: JSON.parse(response).itemsAccepted === expectedAcceptedItemCount
                });
            };

            // check for errors in sender
            var onError = (error: Error) => {
                callback(null, {
                    type: type,
                    name: name + " " + error.name + " " + error.message,
                    result: false
                });
            };

            var sender: Sender = new Sender(browserSender._config, onSuccess, onError);
            browserSender._sender = (payload: string) => sender.send(payload);
        });
    }
}

export = E2ETests;
