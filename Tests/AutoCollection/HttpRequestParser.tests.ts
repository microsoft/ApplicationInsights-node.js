import assert = require("assert");
import sinon = require("sinon");

import HttpRequestParser = require("../../AutoCollection/HttpRequestParser");
import CorrelationIdManager = require("../../Library/CorrelationIdManager");
import Util = require("../../Library/Util");
import Traceparent = require("../../Library/Traceparent");

describe("AutoCollection/HttpRequestParser", () => {
    describe("#parseId()", () => {
        it("should extract guid out of cookie", () => {
            var cookieValue = "id|1234|1234";
            var actual = HttpRequestParser.parseId(cookieValue);
            assert.equal("id", actual, "id in cookie is parsed correctly");
        });
    });

    describe("#w3c", () => {
        var backCompatFormat = /^\|[0-z]{32}\.[0-z]{16}\./g; // |traceId.spanId.
        var request = {
            method: "GET",
            url: "/search?q=test",
            connection: {
                encrypted: false
            },
            headers: {
                host: "bing.com"
            }
        };

        var w3cRequest = {...request, headers: {...request.headers, traceparent: "00-26130040769d49c4826831c978e85131-96665a1c28c5482e-00"}};
        var legacyRequest = {...request, headers: {...request.headers, "request-id": "|abc.def."}};
        var legacyRequestW3C = {...request, headers: {...request.headers, "request-id": "|26130040769d49c4826831c978e85131.96665a1c28c5482e."}};
        var legacyRequestUnique = {...request, headers: {...request.headers, "request-id": "abc"}};
        var legacyRequestUniqueW3C = {...request, headers: {...request.headers, "request-id": "26130040769d49c4826831c978e85131"}};

        before(() => {
            CorrelationIdManager.w3cEnabled = true;
        });

        after(() => {
            CorrelationIdManager.w3cEnabled = false;
        });

        it("should parse traceparent if it is available and w3c tracing is enabled", () => {
            var helper = new HttpRequestParser(<any>w3cRequest);
            var requestTags = helper.getRequestTags({});
            assert.equal(requestTags[(<any>HttpRequestParser).keys.operationId], "26130040769d49c4826831c978e85131");
            assert.equal(requestTags[(<any>HttpRequestParser).keys.operationParentId], "|26130040769d49c4826831c978e85131.96665a1c28c5482e.");
            assert.ok(Traceparent.isValidSpanId(helper["traceparent"].spanId));
        });

        it("if w3c tracing is enabled and !traceparent && request-id ~ |X.Y., generate traceparent", () => {
            var helper = new HttpRequestParser(<any>legacyRequest);
            var requestTags = helper.getRequestTags({});
            assert.equal(helper["legacyRootId"], "abc");
            assert.equal(helper["parentId"], legacyRequest.headers["request-id"]);
            assert.ok(helper["requestId"].match(backCompatFormat));
            assert.ok(Util.isValidW3CId(requestTags[(<any>HttpRequestParser).keys.operationId]));
            assert.ok(Util.isValidW3CId(helper["requestId"].substr(1, 32)));
            const traceparent = helper["traceparent"];
            assert.equal(traceparent.version, Traceparent["DEFAULT_VERSION"]);
            assert.ok(Util.isValidW3CId(traceparent.traceId));
            assert.ok(Traceparent.isValidSpanId(traceparent.spanId));
            assert.notEqual(traceparent.traceId, traceparent.spanId);
            assert.equal(traceparent.traceFlag, Traceparent["DEFAULT_TRACE_FLAG"]);
        });

        it("if w3c tracing is enabled and request-id in format of X", () => {
            var helper = new HttpRequestParser(<any>legacyRequestUnique);
            var requestTags = helper.getRequestTags({});
            assert.equal(helper["parentId"], legacyRequestUnique.headers["request-id"], "parentId is same as request-id");
            assert.ok(helper["requestId"].match(backCompatFormat));
            assert.equal(helper["legacyRootId"], "abc");
            assert.ok(Util.isValidW3CId(requestTags[(<any>HttpRequestParser).keys.operationId]));
            const traceparent = helper["traceparent"];
            assert.equal(traceparent.version, Traceparent["DEFAULT_VERSION"]);
            assert.ok(Util.isValidW3CId(traceparent.traceId));
            assert.ok(Traceparent.isValidSpanId(traceparent.spanId));
            assert.notEqual(traceparent.traceId, traceparent.spanId);
            assert.equal(traceparent.traceFlag, Traceparent["DEFAULT_TRACE_FLAG"]);
        });

        it("should generate a traceparent if both tracing headers are not present (p4)", () => {
            var helper = new HttpRequestParser(<any>request);
            var requestTags = helper.getRequestTags({});
            assert.ok(!helper["parentId"]);
            assert.ok(helper["requestId"]);
            assert.ok(helper["requestId"].match(backCompatFormat));
            assert.ok(Util.isValidW3CId(requestTags[(<any>HttpRequestParser).keys.operationId]));
            const traceparent = helper["traceparent"];
            assert.equal(traceparent.version, Traceparent["DEFAULT_VERSION"]);
            assert.ok(Util.isValidW3CId(traceparent.traceId));
            assert.ok(Traceparent.isValidSpanId(traceparent.spanId));
            assert.notEqual(traceparent.traceId, traceparent.spanId);
            assert.equal(traceparent.traceFlag, Traceparent["DEFAULT_TRACE_FLAG"]);

            assert.equal(traceparent.traceId, helper["operationId"]);
            assert.notEqual(traceparent.spanId, helper["operationId"]);
        })
    });

    describe("#getRequestData()", () => {
        var request = {
            method: "GET",
            url: "/search?q=test",
            connection: {
                encrypted: false
            },
            headers: {
                host: "bing.com"
            }
        }
        
        it("should propagate a custom timestamp", () => {
            var helper = new HttpRequestParser(<any>request);
            helper["startTime"] = 321;
            var requestData1 = helper.getRequestTelemetry({time: new Date(123)});
            var requestData2 = helper.getRequestTelemetry({time: new Date(456)});
            var requestData3 = helper.getRequestTelemetry();

            assert.deepEqual(requestData1.time, new Date(123));
            assert.deepEqual(requestData2.time, new Date(456));
            assert.deepEqual(requestData3.time, new Date(321));
            assert.notDeepEqual(requestData1, requestData2);
        });

        it("should return an absolute url", () => {
            var helper = new HttpRequestParser(<any>request);
            var requestData = helper.getRequestTelemetry();
            assert.equal(requestData.url, "http://bing.com/search?q=test");
        });

        it("should return an absolute url for encrypted traffic", () => {
            request.connection.encrypted = true;

            var helper = new HttpRequestParser(<any>request);
            var requestData = helper.getRequestTelemetry();
            assert.equal(requestData.url, "https://bing.com/search?q=test");
        });

        var requestComplex = {
            method: "GET",
            url: "/a/b/c/?q=test&test2",
            connection: {
                encrypted: false
            },
            headers: {
                host: "bing.com"
            }
        }

        it("should return an absolute url for complex urls", () => {
            var helper = new HttpRequestParser(<any>requestComplex);
            var requestData = helper.getRequestTelemetry();
            assert.equal(requestData.url, "http://bing.com/a/b/c/?q=test&test2");
        });

        var requestNoSearchParam = {
            method: "method",
            url: "/a/",
            connection: {
                encrypted: false
            },
            headers: {
                host: "bing.com"
            }
        }

        it("should return an absolute url when url does not have search part", () => {
            var helper = new HttpRequestParser(<any>requestNoSearchParam);
            var requestData = helper.getRequestTelemetry();
            assert.equal(requestData.url, "http://bing.com/a/");
        });

        var requestNoPathName = {
            method: "method",
            url: "/",
            connection: {
                encrypted: false
            },
            headers: {
                host: "bing.com"
            }
        }

        it("should return an absolute url when url does not have path name", () => {
            var helper = new HttpRequestParser(<any>requestNoPathName);
            var requestData = helper.getRequestTelemetry();
            assert.equal(requestData.url, "http://bing.com/");
        });
    });

    describe("#getRequestTags()", () => {

        var request = {
            method: "GET",
            url: "/search?q=test",
            connection: {
                encrypted: false
            },
            headers: {
                host: "bing.com",
                "x-forwarded-for": "123.123.123.123",
                "cookie": "ai_user=cookieUser|time;ai_session=cookieSession|time;ai_authUser=cookieAuthUser|time",
                "x-ms-request-id": "parentRequestId",
                "x-ms-request-root-id": "operationId",
            }
        }

        it("should not override context tags if they are already set", () => {
            var helper = new HttpRequestParser(<any>request);

            var originalTags: {[key: string]:string} = {
                [(<any>HttpRequestParser).keys.locationIp]: 'originalIp',
                [(<any>HttpRequestParser).keys.userId]: 'originalUserId',
                [(<any>HttpRequestParser).keys.userAuthUserId]: 'originalAuthUserId',
                [(<any>HttpRequestParser).keys.userAgent]: 'originalUserAgent',
                [(<any>HttpRequestParser).keys.operationName]: 'originalOperationName',
                [(<any>HttpRequestParser).keys.operationId]: 'originalOperationId',
                [(<any>HttpRequestParser).keys.operationParentId]: 'originalOperationParentId'
            };
            var newTags = helper.getRequestTags(originalTags);
            assert.equal(newTags[(<any>HttpRequestParser).keys.locationIp], 'originalIp');
            assert.equal(newTags[(<any>HttpRequestParser).keys.userId], 'originalUserId');
            assert.equal(newTags[(<any>HttpRequestParser).keys.userAuthUserId], 'originalAuthUserId');
            assert.equal(newTags[(<any>HttpRequestParser).keys.userAgent], 'originalUserAgent');
            assert.equal(newTags[(<any>HttpRequestParser).keys.operationName], 'originalOperationName');
            assert.equal(newTags[(<any>HttpRequestParser).keys.operationId], 'originalOperationId');
            assert.equal(newTags[(<any>HttpRequestParser).keys.operationParentId], 'originalOperationParentId');
        });

        it("should read tags from headers", () => {
            var helper = new HttpRequestParser(<any>request);

            var originalTags: {[key: string]:string} = {
            };

            var newTags = helper.getRequestTags(originalTags);
            assert.equal(newTags[(<any>HttpRequestParser).keys.locationIp], '123.123.123.123');
            assert.equal(newTags[(<any>HttpRequestParser).keys.userId], 'cookieUser');
            assert.equal(newTags[(<any>HttpRequestParser).keys.userAuthUserId], 'cookieAuthUser');
            assert.equal(newTags[(<any>HttpRequestParser).keys.userAgent], undefined);
            assert.equal(newTags[(<any>HttpRequestParser).keys.operationName], 'GET /search');
            assert.equal(newTags[(<any>HttpRequestParser).keys.operationId], 'operationId');
            assert.equal(newTags[(<any>HttpRequestParser).keys.operationParentId], 'parentRequestId');
        });
    });
});
