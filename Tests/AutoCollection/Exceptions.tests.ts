import assert = require("assert");
import sinon = require("sinon");

import AutoCollectionExceptions = require("../../AutoCollection/Exceptions");

describe("AutoCollection/Exceptions", () => {
    describe("#getExceptionData()", () => {
        var simpleError: Error;
        
        beforeEach(() => {
            try {
                throw Error("simple error");
            } catch(e) {
                simpleError = e;
            }
        });
            
        it("fills empty 'method' with '<no_method>'", () => {
            simpleError.stack = "  at \t (/path/file.js:12:34)\n" + simpleError.stack;
            
            var exceptionData = AutoCollectionExceptions.getExceptionData(simpleError, false);
            
            var actual = exceptionData.baseData.exceptions[0].parsedStack[0].method;
            var expected = "<no_method>";
            
            assert.deepEqual(actual, expected);
        });
        
        it("fills empty 'method' with '<no_filename>'", () => {
            simpleError.stack = "  at Context.<anonymous> (\t:12:34)\n" + simpleError.stack;
            
            var exceptionData = AutoCollectionExceptions.getExceptionData(simpleError, false);
            
            var actual = exceptionData.baseData.exceptions[0].parsedStack[0].fileName;
            var expected = "<no_filename>";
            
            assert.deepEqual(actual, expected);
        });
	});
});
