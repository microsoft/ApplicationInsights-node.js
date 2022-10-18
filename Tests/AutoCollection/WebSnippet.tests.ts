import assert = require("assert");
import http = require("http");
import sinon = require("sinon");
import os = require("os");

import AppInsights = require("../../applicationinsights");
import WebSnippet = require("../../AutoCollection/WebSnippet");
import SnippetInjectionHelper = require("../../Library/SnippetInjectionHelper");

describe("AutoCollection/WebSnippet", () => {
    var sandbox: sinon.SinonSandbox;
    let originalEnv: NodeJS.ProcessEnv;
 
    afterEach(() => {
        process.env = originalEnv;
        AppInsights.dispose();
        sandbox.restore();
    });

    beforeEach(() =>{
        originalEnv = process.env;
        sandbox = sinon.sandbox.create();
    })

    describe("#init and #dispose()", () => {
        it("init should enable and dispose should stop when using OLD injection name", () => {
            var appInsights = AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").enableAutoWebSnippetInjection(true);
            var enableWebSnippetsSpy = sinon.spy(WebSnippet.INSTANCE, "enable");
            appInsights.start();

            assert.equal(enableWebSnippetsSpy.callCount, 1, "enable should be called once as part of autocollection initialization");
            assert.equal(enableWebSnippetsSpy.getCall(0).args[0], true);
            AppInsights.dispose();
            assert.equal(enableWebSnippetsSpy.callCount, 2, "enable(false) should be called once as part of autocollection shutdown");
            assert.equal(enableWebSnippetsSpy.getCall(1).args[0], false);
        });
        it("init should enable and dispose should stop", () => {
            var appInsights = AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").enableWebInstrumentation(true);
            var enableWebSnippetsSpy = sinon.spy(WebSnippet.INSTANCE, "enable");
            appInsights.start();

            assert.equal(enableWebSnippetsSpy.callCount, 1, "enable should be called once as part of autocollection initialization");
            assert.equal(enableWebSnippetsSpy.getCall(0).args[0], true);
            AppInsights.dispose();
            assert.equal(enableWebSnippetsSpy.callCount, 2, "enable(false) should be called once as part of autocollection shutdown");
            assert.equal(enableWebSnippetsSpy.getCall(1).args[0], false);
        });
    });

    describe("#validate response", () => {
        it("injection should be triggered only in HTML responses", () => {
            var appInsights = AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").enableWebInstrumentation(true);
            let webSnippet = WebSnippet.INSTANCE;
         
            let _headers: any = {};
            let response: http.ServerResponse = <any>{
                setHeader: (header: string, value: string) => {
                    _headers[header] = value;
                },
                getHeader: (header: string) => { return _headers[header]; }
            };
            response.statusCode = 300;
            let validHtml = "<html><head></head><body></body></html>";
            assert.equal(webSnippet.ValidateInjection(response, validHtml), false); // status code is not 200
            response.statusCode = 200;
            assert.equal(webSnippet.ValidateInjection(response, validHtml), false); // No html header
            response.setHeader("Content-Type", "text/html");
            assert.equal(webSnippet.ValidateInjection(response, validHtml), true); // Valid
            assert.equal(webSnippet.ValidateInjection(response, "test"), false); // No html text
            assert.equal(webSnippet.ValidateInjection(response, "<html><body></body></html>"), false); // No head element
            response.setHeader("Content-Type", "text/plain");
            assert.equal(webSnippet.ValidateInjection(response, validHtml), false); // No HTML content type
            response.setHeader("Content-Type", "text/html");
            let validBuffer = Buffer.from(validHtml);
            assert.equal(webSnippet.ValidateInjection(response, validBuffer), true); // Valid Buffer
            assert.equal(webSnippet.ValidateInjection(response, Buffer.from("test")), false); // not valid Buffer
        });
    });

    describe("#web snippet injection to string", () => {
        var appInsights = AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").enableWebInstrumentation(true);
        let webSnippet = WebSnippet.INSTANCE;
        webSnippet.enable(true);
        it("injection add correct snippet code", () => {
            let _headers: any = {};
            let response: http.ServerResponse = <any>{
                setHeader: (header: string, value: string) => {
                    _headers[header] = value;
                },
                getHeader: (header: string) => { return _headers[header]; },
                removeHeader: (header: string) => { _headers[header] = undefined; }
            };
            response.setHeader("Content-Type", "text/html");
            response.statusCode = 200;
            let validHtml = "<html><head></head><body></body></html>";
            assert.equal(webSnippet.ValidateInjection(response, validHtml), true); 
            let newHtml = webSnippet.InjectWebSnippet(response, validHtml).toString();
            assert.ok(newHtml.indexOf("https://js.monitor.azure.com/scripts/b/ai.2.min.js") >= 0);
            assert.ok(newHtml.indexOf("<html><head>") == 0);
            assert.ok(newHtml.indexOf('instrumentationKey: "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"') >= 0);
        });

        it("injection web snippet should overwrite content length ", () => {
            let _headers: any = {};
            let response: http.ServerResponse = <any>{
                setHeader: (header: string, value: string) => {
                    _headers[header] = value;
                },
                getHeader: (header: string) => { return _headers[header]; },
                removeHeader: (header: string) => { _headers[header] = undefined; }
            };
            response.setHeader("Content-Type", "text/html");
            response.setHeader("Content-Length", 39);
            let validHtml = "<html><head></head><body></body></html>";
            let newHtml = webSnippet.InjectWebSnippet(response, validHtml).toString();
            assert.ok(newHtml.length > 4000);
            assert.ok(Number(response.getHeader("Content-Length")) > 4000); // Content length updated
        });
    });

    describe("#validate snippet src url", () => {
        it("snippet should use provided snippet src url ", () => {
            let client = new AppInsights.TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            client.config.webInstrumentationSrc = "WebInstrumentationTestSourceURL";
            let webSnippet = new WebSnippet(client);
            webSnippet.enable(true);
            let _headers: any = {};
            let response: http.ServerResponse = <any>{
                setHeader: (header: string, value: string) => {
                    _headers[header] = value;
                },
                getHeader: (header: string) => { return _headers[header]; },
                removeHeader: (header: string) => { _headers[header] = undefined; }
            };
            response.setHeader("Content-Type", "text/html");
            response.statusCode = 200;
            let validHtml = "<html><head></head><body></body></html>";
            assert.equal(webSnippet.ValidateInjection(response, validHtml), true); 
            let newHtml = webSnippet.InjectWebSnippet(response, validHtml).toString();
            assert.ok(newHtml.indexOf("https://js.monitor.azure.com/scripts/b/ai.2.min.js") < 0);
            assert.ok(newHtml.indexOf("WebInstrumentationTestSourceURL") >= 0);
            assert.ok(newHtml.indexOf("<html><head>") == 0);
            assert.ok(newHtml.indexOf('instrumentationKey: "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"') >= 0);
        });

        it("snippet should use provided config ", () => {
            let client = new AppInsights.TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            client.config.webInstrumentationSrc = "WebInstrumentationTestSourceURL";
            client.config.webInstrumentationConfig = [{name: "key1",value: "key1"},{name:"key2", value: true}];

            let webSnippet = new WebSnippet(client);
            webSnippet.enable(true);
            let _headers: any = {};
            let response: http.ServerResponse = <any>{
                setHeader: (header: string, value: string) => {
                    _headers[header] = value;
                },
                getHeader: (header: string) => { return _headers[header]; },
                removeHeader: (header: string) => { _headers[header] = undefined; }
            };
            response.setHeader("Content-Type", "text/html");
            response.statusCode = 200;
            let validHtml = "<html><head></head><body></body></html>";
            assert.equal(webSnippet.ValidateInjection(response, validHtml), true); 
            let newHtml = webSnippet.InjectWebSnippet(response, validHtml);
            let osType = os.type() === "Windows_NT"? "w":"l";
            let expectedStr = 
            `    instrumentationKey: "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",\r\n key1: "key1",\r\n key2: true,\r\n disableIkeyDeprecationMessage: true,\r\n sdkExtension: "u${osType}d_n_`;
            assert.ok(newHtml.indexOf("https://js.monitor.azure.com/scripts/b/ai.2.min.js") < 0);
            assert.ok(newHtml.indexOf("WebInstrumentationTestSourceURL") >= 0);
            assert.ok(newHtml.indexOf("<html><head>") == 0);
            assert.ok(newHtml.indexOf(expectedStr) >= 0);
        });
    });


    describe("#web snippet injection to buffer", () => {
        var appInsights = AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").enableWebInstrumentation(true);
        let webSnippet = WebSnippet.INSTANCE
        webSnippet.enable(true);
        it("injection add correct snippet code", () => {
            let _headers: any = {};
            let response: http.ServerResponse = <any>{
                setHeader: (header: string, value: string) => {
                    _headers[header] = value;
                },
                getHeader: (header: string) => { return _headers[header]; },
                removeHeader: (header: string) => { _headers[header] = undefined; }
            };
            response.setHeader("Content-Type", "text/html");
            response.statusCode = 200;
            let validHtml = "<html><head></head><body></body></html>";
            let validBuffer = Buffer.from(validHtml);
            assert.equal(webSnippet.ValidateInjection(response, validBuffer), true); 
            let newHtml = webSnippet.InjectWebSnippet(response, validBuffer).toString();
            assert.ok(newHtml.indexOf("https://js.monitor.azure.com/scripts/b/ai.2.min.js") >= 0);
            assert.ok(newHtml.indexOf("<html><head>") == 0);
            assert.ok(newHtml.indexOf('instrumentationKey: "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"') >= 0);
        });

        it("injection web snippet should overwrite content length ", () => {
            let _headers: any = {};
            let response: http.ServerResponse = <any>{
                setHeader: (header: string, value: string) => {
                    _headers[header] = value;
                },
                getHeader: (header: string) => { return _headers[header]; },
                removeHeader: (header: string) => { _headers[header] = undefined; }
            };
            let validHtml = "<html><head></head><body>ZKrIVPWptS13MH4my8kbkjWHF5BoNUIfvzfvt6LSE3qg1GoMOZ9bgNJcdcUXDc3l3jyCP9WIK2Z002rqBCn24cfwYjXLmq6kOO6SVFIFhQqNUwrmpA5"+
            "vumrQRAHtkqJWWV91I1NS2VjwYpmCytH8rg6qAScR0Qoy0UFXQGd0QO1hkqwH2jzEApklsDqCgMavANBoqKfg715afWySfKba9YG6S5iIIIySsBeg1vlM3" +
            "7fvNKTeA7wHHK8IOkbWlTM70yFn1flvJKOlbsabIgnO48atkizsyS0ITZKudpYzcALY3simblbi0I3DIwUjfW46FHyXYTfvfmNo9cbOyVZsJQrJshp2zck</body></html>";
            let validBuffer = Buffer.from(validHtml);
            let originalBufferSize = validBuffer.length;
            response.setHeader("Content-Type", "text/html");
            response.setHeader("Content-Length", originalBufferSize);
            let newHtml = webSnippet.InjectWebSnippet(response, validBuffer);
            let isValidBufferEncode = SnippetInjectionHelper.isBufferType(validBuffer,"utf8");
            assert.ok(isValidBufferEncode);
         
            assert.ok(newHtml.length > originalBufferSize);
            assert.ok(Number(response.getHeader("Content-Length")) > originalBufferSize); // Content length updated
        });
    });

    describe("#web snippet replace correct connection string from config", () => {
        it("injection should use correct connection string from config", () => {
            var appInsights = AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").enableWebInstrumentation(true,"InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3330;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
            let webSnippet = WebSnippet.INSTANCE;
            webSnippet.enable(true, "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3330;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
            assert.equal(webSnippet["_isIkeyValid"], true,"ikey should be set to valid");
            let _headers: any = {};
            let response: http.ServerResponse = <any>{
                setHeader: (header: string, value: string) => {
                    _headers[header] = value;
                },
                getHeader: (header: string) => { return _headers[header]; },
                removeHeader: (header: string) => { _headers[header] = undefined; }
            };
            response.setHeader("Content-Type", "text/html");
            response.statusCode = 200;
            let validHtml = "<html><head></head><body></body></html>";
            assert.equal(webSnippet.ValidateInjection(response, validHtml), true); 
            let newHtml = webSnippet.InjectWebSnippet(response, validHtml).toString();
            assert.ok(newHtml.indexOf("https://js.monitor.azure.com/scripts/b/ai.2.min.js") >= 0);
            assert.ok(newHtml.indexOf("<html><head>") == 0);
            assert.ok(newHtml.indexOf('instrumentationKey: "1aa11111-bbbb-1ccc-8ddd-eeeeffff3330"') >= 0);
        });
    });

    describe("#web snippet enable should throw errors when ikey from config is not valid", () => {
        it("injection should throw errors when ikey from config is not valid", () => {
            var infoStub = sandbox.stub(console, "info");
            var appInsights = AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").enableWebInstrumentation(true,"InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeff;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
            let webSnippet = WebSnippet.INSTANCE;
            webSnippet.enable(true, "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeff;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
            assert.equal(webSnippet["_isIkeyValid"], false,"ikey should be set to invalid");
            assert.ok(infoStub.calledOn, "invalid key warning was raised");
        });
    });
});
