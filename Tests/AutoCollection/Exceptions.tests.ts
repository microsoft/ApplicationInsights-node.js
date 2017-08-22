import assert = require("assert");
import sinon = require("sinon");

import AutoCollectionExceptions = require("../../AutoCollection/Exceptions");
import Client = require("../../Library/Client");
import AppInsights = require("../../applicationinsights");

describe("AutoCollection/Exceptions", () => {
    describe("#getExceptionData()", () => {
        var simpleError: Error;

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
    });

    describe("#init and dispose()", () => {
        afterEach(() => {
            AppInsights.dispose();
        });

        it("disables autocollection", () => {
            var processOnSpy = sinon.spy(global.process, "on");
            var processRemoveListenerSpy = sinon.spy(global.process, "removeListener");

            AppInsights.setup("key").setAutoCollectExceptions(true).start();
            assert.equal(processOnSpy.callCount, 2, "After enabling exception autocollection, there should be 2 calls to processOnSpy");
            assert.equal(processOnSpy.getCall(0).args[0], AutoCollectionExceptions.UNCAUGHT_EXCEPTION_HANDLER_NAME);
            assert.equal(processOnSpy.getCall(1).args[0], AutoCollectionExceptions.UNHANDLED_REJECTION_HANDLER_NAME);
        });
    });
});
