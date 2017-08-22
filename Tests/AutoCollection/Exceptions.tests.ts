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

    describe("#dispose()", () => {
        it("disables autocollection", () => {
            var uncaughtExceptionListenerCountBeforeEnable = process.listenerCount(AutoCollectionExceptions.UNCAUGHT_EXCEPTION_HANDLER_NAME);
            var unhandledRejectionListenerCountEnable = process.listenerCount(AutoCollectionExceptions.UNHANDLED_REJECTION_HANDLER_NAME);

            AppInsights.setup("key").setAutoCollectExceptions(true).start();
            var uncaughtExceptionListenerCountAfterEnable = process.listenerCount(AutoCollectionExceptions.UNCAUGHT_EXCEPTION_HANDLER_NAME);
            var unhandledRejectionListenerAfterEnable = process.listenerCount(AutoCollectionExceptions.UNHANDLED_REJECTION_HANDLER_NAME);

            assert.equal(
                uncaughtExceptionListenerCountAfterEnable,
                uncaughtExceptionListenerCountBeforeEnable + 1,
                "After enabling exception autocollection, there should be one more uncaughtException listener");

            assert.equal(
                unhandledRejectionListenerAfterEnable,
                unhandledRejectionListenerCountEnable + 1,
                "After enabling exception autocollection, there should be one more unhandledRejection listener");


            AppInsights.dispose();
            var uncaughtExceptionListenerCountAfterDispose = process.listenerCount(AutoCollectionExceptions.UNCAUGHT_EXCEPTION_HANDLER_NAME);
            var unhandledRejectionListenerAfterDispose = process.listenerCount(AutoCollectionExceptions.UNHANDLED_REJECTION_HANDLER_NAME);

            assert.equal(
                uncaughtExceptionListenerCountAfterDispose,
                uncaughtExceptionListenerCountBeforeEnable,
                "After calling dispose, there should be the same number of uncaughtException listeners as before initial enable");

            assert.equal(
                unhandledRejectionListenerAfterDispose,
                unhandledRejectionListenerCountEnable,
                "After calling dispose, there should be the same number of unhandledRejection listeners as before initial enable");
        });
    });
});
