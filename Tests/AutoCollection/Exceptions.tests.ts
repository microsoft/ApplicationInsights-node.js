///<reference path="..\..\Declarations\node\node.d.ts" />
///<reference path="..\..\Declarations\mocha\mocha.d.ts" />
///<reference path="..\..\Declarations\sinon\sinon.d.ts" />

import assert = require("assert");
import sinon = require("sinon");

import AutoCollectionExceptions = require("../../AutoCollection/Exceptions");

describe("AutoCollection/Exceptions", () => {
    describe("#getExceptionData()", () => {
        var simpleError;

        beforeEach(() => {
            try {
                throw Error("simple error");
            } catch (e) {
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

        it("does not include stack trace if disabled", () => {
            AutoCollectionExceptions.IsStackTrackCollectionEnabled = false;

            var exceptionData = AutoCollectionExceptions.getExceptionData(simpleError, false);

            assert.equal(exceptionData.baseData.exceptions[0].parsedStack, false, "no stack trace");
            assert.equal(exceptionData.baseData.exceptions[0].hasFullStack, false, "no full stack");

            // reset to default value
            AutoCollectionExceptions.IsStackTrackCollectionEnabled = true;
        })
    });
});