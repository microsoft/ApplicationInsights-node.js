///<reference path="..\..\Declarations\node\node.d.ts" />
///<reference path="..\..\Declarations\mocha\mocha.d.ts" />
///<reference path="..\..\Declarations\sinon\sinon.d.ts" />

import assert = require("assert");
import sinon = require("sinon");

import Util = require("../../Library/Util");

describe("Library/Util", () => {

    describe("#getCookie(name, cookie)", () => {

        var test = (cookie, query, expected) => {
            var actual = Util.getCookie(query, cookie);
            assert.equal(expected, actual, "cookie is parsed correctly");
        }

        it("should parse expected input", () => {
            test("testCookie=id|acq|renewal", "testCookie", "id|acq|renewal");
        });

        it("should parse expected input with another cookie present before", () => {
            test("other=foo; testCookie=id|acq|renewal", "testCookie", "id|acq|renewal");
        });

        it("should parse expected input with another cookie present after", () => {
            test("another=bar; ;a=testCookie=; testCookie=id|acq|renewal; other=foo|3|testCookie=", "testCookie", "id|acq|renewal");
        });

        it("should ignore similar names", () => {
            test("xtestCookiex=id|acq|renewal", "testCookie", "");
        });

        it("should not crash on unexpected input", () => {
            test("", "testCookie", "");
        });
    });

    describe("#trim(str)", () => {
        it("should not crash", () => {
            assert.doesNotThrow(() => Util.trim(undefined));
            assert.doesNotThrow(() => Util.trim(null));
            assert.doesNotThrow(() => Util.trim(""));
            assert.doesNotThrow(() => Util.trim(<any>3));
            assert.doesNotThrow(() => Util.trim(<any>{}));
            assert.doesNotThrow(() => Util.trim(<any>[]));
        });

        it("should trim strings", () => {
            assert.equal(Util.trim(""), "");
            assert.equal(Util.trim("\t"), "");
            assert.equal(Util.trim("\n"), "");
            assert.equal(Util.trim("\t\n\r test \t\n\r"), "test");
            assert.equal(Util.trim("\t\n\r test \t\n\r test \t\n\r"), "test \t\n\r test");
        });
    });

    describe("#newGuid()", () => {
        it("should generate a valid guid", () => {
            var mathStub = sinon.stub(Math, "random", () => 0);
            var expected = "00000000-0000-4000-8000-000000000000";
            var actual = Util.newGuid();
            assert.equal(actual, expected, "expected guid was generated");
            mathStub.restore();
        });
    });

    describe("#isArray(obj)", () => {
        it("should detect if an object is an array", () => {
            assert.ok(Util.isArray([]));
            assert.ok(!Util.isArray("sdf"));
            assert.ok(Util.isArray([0, 1]));
            assert.ok(!Util.isArray({length: ""}));
            assert.ok(!Util.isArray({length: 10}));
        });
    });


    describe("#msToTimeSpan(totalMs)", () => {
        var test = (input, expected, message) => {
            var actual = Util.msToTimeSpan(input);
            assert.equal(expected, actual, message);
        }

        it("should convert milliseconds to a c# timespan", () => {
            test(0, "00:00:00.000", "zero");
            test(1, "00:00:00.001", "milliseconds digit 1");
            test(10, "00:00:00.010", "milliseconds digit 2");
            test(100, "00:00:00.100", "milliseconds digit 3");
            test(1 * 1000, "00:00:01.000", "seconds digit 1");
            test(10 * 1000, "00:00:10.000", "seconds digit 2");
            test(1 * 60 * 1000, "00:01:00.000", "minutes digit 1");
            test(10 * 60 * 1000, "00:10:00.000", "minutes digit 2");
            test(1 * 60 * 60 * 1000, "01:00:00.000", "hours digit 1");
            test(10 * 60 * 60 * 1000, "10:00:00.000", "hours digit 2");
            test(24 * 60 * 60 * 1000, "00:00:00.000", "hours overflow");
            test(11 * 3600000 + 11 * 60000 + 11111, "11:11:11.111", "all digits");
        });

        it("should handle invalid input", () => {
            test("", "00:00:00.000", "invalid input");
            test("'", "00:00:00.000", "invalid input");
            test(NaN, "00:00:00.000", "invalid input");
            test({}, "00:00:00.000", "invalid input");
            test([], "00:00:00.000", "invalid input");
            test(-1, "00:00:00.000", "invalid input");
        });
    });
});