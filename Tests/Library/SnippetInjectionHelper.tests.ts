import assert = require("assert");
import http = require("http");
import sinon = require("sinon");
import snippetInjectionHelper = require("../../Library/SnippetInjectionHelper");

import AppInsights = require("../../applicationinsights");
import WebSnippet = require("../../AutoCollection/WebSnippet");

const testStr = "ZKrIVPWptS13MH4my8kbkjWHF5BoNUIfvzfvt6LSE3qg1GoMOZ9bgNJcdcUXDc3l3jyCP9WIK2Z002rqBCn24cfwYjXLmq6kOO6SVFIFhQqNUwrmpA5";

describe("Library/SnippetInjectionHelper", () => {

    describe("#isBufferType(buffer, encodingType)", () => {
        it("should find correct buffer encoding type", () => {
            const encodingTypes = snippetInjectionHelper.bufferEncodingTypes;
            for (let key in encodingTypes) {
                let type = encodingTypes[key];
                assert.equal(Buffer.isEncoding(type), true, "buffer should support "+ type + " encoding");
            }
            let utf8Buffer = Buffer.from(testStr);
            assert.equal(snippetInjectionHelper.isBufferType(utf8Buffer), true, "buffer should be default to utf8 encoding type");
            assert.equal(snippetInjectionHelper.isBufferType(utf8Buffer,"utf8"), true, "buffer should be utf8 encoding type");

            let hexBuffer = Buffer.from(utf8Buffer.toString("hex"));
            assert.equal(snippetInjectionHelper.isBufferType(hexBuffer,"hex"), true, "buffer should be hex encoding type");
        });
    });

    describe("#isSupportedContentEncoding(encodingMethod)", () => {
        let contentEncodingMethods = snippetInjectionHelper.contentEncodingMethod;
        it("not supported encoding", () => {
            assert.equal(snippetInjectionHelper.isSupportedContentEncoding(""), null, "should return null -- not supported");
            assert.equal(snippetInjectionHelper.isSupportedContentEncoding("test"), null, "should return null -- not supported");
        });
        it("suppotred encoding method", () => {
            assert.equal(snippetInjectionHelper.isSupportedContentEncoding("gzip"), contentEncodingMethods.GZIP, "should return gzip");
            assert.equal(snippetInjectionHelper.isSupportedContentEncoding("br"), contentEncodingMethods.BR, "should return br");
            assert.equal(snippetInjectionHelper.isSupportedContentEncoding("deflate"), contentEncodingMethods.DEFLATE, "should return deflate");
        });
    });

    describe("#getContentEncodingFromHeaders(response)", () => {
        it("should return correct content encoding methods from empty reponse headers", () => {
            let _headers: any = {};
            let response: http.ServerResponse = <any>{
                setHeader: (header: string, value: string) => {
                    _headers[header] = value;
                },
                getHeader: (header: string) => { return _headers[header]; }
            };
            response.statusCode = 200;
            assert.equal(snippetInjectionHelper.getContentEncodingFromHeaders(response), null, "should return null when header is not set");
        });

        it("should return correct content encoding methods from reponse headers", () => {
            let _headers: any = {};
            let contentMethods = snippetInjectionHelper.contentEncodingMethod;
            let expected: snippetInjectionHelper.contentEncodingMethod[] = [contentMethods.GZIP]
            let response: http.ServerResponse = <any>{
                setHeader: (header: string, value: string) => {
                    _headers[header] = value;
                },
                getHeader: (header: string) => { return _headers[header]; }
            };
            response.setHeader("Content-Encoding", "gzip");
            response.statusCode = 200;
            let test = snippetInjectionHelper.getContentEncodingFromHeaders(response);
            assert.deepEqual(snippetInjectionHelper.getContentEncodingFromHeaders(response),expected, "should return gzip");
        });

        it("should return correct content encoding methods from mutiple headers", () => {
            let _headers: any = {};
            let expected: snippetInjectionHelper.contentEncodingMethod[] = []
            let response: http.ServerResponse = <any>{
                setHeader: (header: string, value: string) => {
                    _headers[header] = value;
                },
                getHeader: (header: string) => { return _headers[header]; }
            };
            response.setHeader("Content-Encoding", ["gzip","br"]);
            response.statusCode = 200;
            let test = snippetInjectionHelper.getContentEncodingFromHeaders(response);
            assert.equal(test.length,0);
            assert.deepEqual(snippetInjectionHelper.getContentEncodingFromHeaders(response), expected, "should return an empty when mutiple headers are set");
        });
    });

    describe("#insertSnippetByIndex(index, html, snippet)", () => {
        it("should return correct content encoding methods from reponse headers", () => {
            assert.equal(snippetInjectionHelper.insertSnippetByIndex(-1,"html","snippet"), null, "should return null when index is < 0");
            let testHtml = "<head></head>";
            let snippet = "snippet";
            assert.equal(snippetInjectionHelper.insertSnippetByIndex(6,testHtml,snippet), '<head><script type="text/javascript">snippet</script></head>', "should insert snippet at correct index");
        });
    });

    describe("#isContentTypeHeaderHtml(response)", () => {
        it("should return correct content encoding methods from reponse headers", () => {
            let _headers: any = {};
            let response: http.ServerResponse = <any>{
                setHeader: (header: string, value: string) => {
                    _headers[header] = value;
                },
                getHeader: (header: string) => { return _headers[header]; }
            };
            response.statusCode = 200;
            assert.equal(snippetInjectionHelper.isContentTypeHeaderHtml(response), false, "should return false when header is not set");
            response.setHeader("Content-Type","application");
            assert.equal(snippetInjectionHelper.isContentTypeHeaderHtml(response), false, "should return false when header does not contain html");
            response.setHeader("Content-Type","text/html");
            assert.equal(snippetInjectionHelper.isContentTypeHeaderHtml(response), true, "should return false when header contains html");
            response.setHeader("Content-Type",["text/html", "charset=utf-8"]);
            assert.equal(snippetInjectionHelper.isContentTypeHeaderHtml(response), true, "should return false when headers contain html");
        });
    });
});