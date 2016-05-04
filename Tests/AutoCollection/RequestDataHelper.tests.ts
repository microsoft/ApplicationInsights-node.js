///<reference path="..\..\Declarations\node\node.d.ts" />
///<reference path="..\..\Declarations\mocha\mocha.d.ts" />
///<reference path="..\..\Declarations\sinon\sinon.d.ts" />


import assert = require("assert");
import sinon = require("sinon");

import RequestDataHelper = require("../../AutoCollection/RequestDataHelper");

describe("AutoCollection/RequestDataHelper", () => {

    describe("#parseSessionId()", () => {
		it("should extract guid out of session cookie", () => {
			var cookieValue = "id|1234|1234";
            var actual = RequestDataHelper.parseSessionId(cookieValue);
            assert.equal("id", actual, "cookie is parsed correctly");
		});
	});
	
	describe("getRequestData()", () => {
		var request = {
			method: "method",
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
			assert.equal(requestData.baseData.url, "http://bing.com/search%3Fq=test");
        });
		
		it("should return an absolute url for encrypted traffic", () => {
			request.connection.encrypted = true;
			
			var helper = new RequestDataHelper(<any>request);
			var requestData = helper.getRequestData();
			assert.equal(requestData.baseData.url, "https://bing.com/search%3Fq=test");
        });
	});
});