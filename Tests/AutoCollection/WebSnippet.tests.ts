import assert = require("assert");
import http = require("http");
import sinon = require("sinon");

import AppInsights = require("../../applicationinsights");
import WebSnippet = require("../../AutoCollection/WebSnippet");


describe("AutoCollection/WebSnippet", () => {
    afterEach(() => {
        AppInsights.dispose();
    });

    describe("#init and #dispose()", () => {
        it("init should enable and dispose should stop injection", () => {
            var appInsights = AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").setWebSnippetInjection(true);
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
            let _headers: any = {};
            let response: http.ServerResponse = <any>{
                setHeader: (header: string, value: string) => {
                    _headers[header] = value;
                },
                getHeader: (header: string) => { return _headers[header]; }
            };
            response.statusCode = 300;
            let validHtml = "<html><head></head><body></body></html>";
            assert.equal(WebSnippet.ValidateInjection(response, validHtml), false); // status code is not 200
            response.statusCode = 200;
            assert.equal(WebSnippet.ValidateInjection(response, validHtml), false); // No html header
            response.setHeader("Content-Type", "text/html");
            assert.equal(WebSnippet.ValidateInjection(response, validHtml), true); // Valid
            assert.equal(WebSnippet.ValidateInjection(response, "test"), false); // No html text
            assert.equal(WebSnippet.ValidateInjection(response, "<html><body></body></html>"), false); // No head element
            response.setHeader("Content-Type", "text/plain");
            assert.equal(WebSnippet.ValidateInjection(response, validHtml), false); // No HTML content type
            response.setHeader("Content-Type", "text/html");
            response.setHeader("Content-Encoding", "gzip");
            assert.equal(WebSnippet.ValidateInjection(response, validHtml), false); // Encoding not supported
        });
    });

    describe("#web snippet injection", () => {
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
            assert.equal(WebSnippet.ValidateInjection(response, validHtml), true); // Encoding not supported
            let newHtml = WebSnippet.InjectWebSnippet(response, validHtml).toString();
            assert.ok(newHtml.indexOf("https://js.monitor.azure.com/scripts/b/ai.2.min.js") >= 0);
            assert.ok(newHtml.indexOf("<html><head>") == 0);
            assert.ok(newHtml.indexOf('instrumentationKey: "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"') >= 0);
            //should not overwrite content-lenghth header when original reponse does not have it.
            assert.equal(!!response.getHeader("Content-Length"), false); 
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
            let newHtml = WebSnippet.InjectWebSnippet(response, validHtml).toString();
            assert.ok(newHtml.length > 4000);
            assert.ok(Number(response.getHeader("Content-Length")) > 4000); // Content length updated
        });
    });

});