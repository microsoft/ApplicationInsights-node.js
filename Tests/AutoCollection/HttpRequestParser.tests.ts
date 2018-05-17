import assert = require("assert");
import sinon = require("sinon");

import HttpRequestParser = require("../../AutoCollection/HttpRequestParser");

describe("AutoCollection/HttpRequestParser", () => {

    describe("#parseId()", () => {
        it("should extract guid out of cookie", () => {
            var cookieValue = "id|1234|1234";
            var actual = HttpRequestParser.parseId(cookieValue);
            assert.equal("id", actual, "id in cookie is parsed correctly");
        });
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
