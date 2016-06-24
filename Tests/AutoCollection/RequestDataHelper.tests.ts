///<reference path="..\..\Declarations\node\node.d.ts" />
///<reference path="..\..\Declarations\mocha\mocha.d.ts" />
///<reference path="..\..\Declarations\sinon\sinon.d.ts" />


import assert = require("assert");
import sinon = require("sinon");

import RequestDataHelper = require("../../AutoCollection/RequestDataHelper");

describe("AutoCollection/RequestDataHelper", () => {

    describe("#parseId()", () => {
		it("should extract guid out of cookie", () => {
			var cookieValue = "id|1234|1234";
            var actual = RequestDataHelper.parseId(cookieValue);
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
			var helper = new RequestDataHelper(<any>request);
			var requestData = helper.getRequestData();
			assert.equal(requestData.baseData.url, "http://bing.com/search?q=test");
        });
		
		it("should return an absolute url for encrypted traffic", () => {
			request.connection.encrypted = true;
			
			var helper = new RequestDataHelper(<any>request);
			var requestData = helper.getRequestData();
			assert.equal(requestData.baseData.url, "https://bing.com/search?q=test");
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
			var helper = new RequestDataHelper(<any>requestComplex);
			var requestData = helper.getRequestData();
			assert.equal(requestData.baseData.url, "http://bing.com/a/b/c/?q=test&test2");
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
			var helper = new RequestDataHelper(<any>requestNoSearchParam);
			var requestData = helper.getRequestData();
			assert.equal(requestData.baseData.url, "http://bing.com/a/");
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
			var helper = new RequestDataHelper(<any>requestNoSearchParam);
			var requestData = helper.getRequestData();
			assert.equal(requestData.baseData.url, "http://bing.com/");
        });
	});
});