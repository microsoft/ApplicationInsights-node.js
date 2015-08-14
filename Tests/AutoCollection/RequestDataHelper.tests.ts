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
});