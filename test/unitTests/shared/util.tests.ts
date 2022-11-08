import * as assert from "assert";
import * as sinon from "sinon";

import { Util } from "../../../src/shared/util";

describe("Library/Util", () => {
    var sandbox: sinon.SinonSandbox;
    before(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("#trim(str)", () => {
        it("should not crash", () => {
            assert.doesNotThrow(() => Util.getInstance().trim(undefined));
            assert.doesNotThrow(() => Util.getInstance().trim(null));
            assert.doesNotThrow(() => Util.getInstance().trim(""));
            assert.doesNotThrow(() => Util.getInstance().trim(<any>3));
            assert.doesNotThrow(() => Util.getInstance().trim(<any>{}));
            assert.doesNotThrow(() => Util.getInstance().trim(<any>[]));
        });

        it("should trim strings", () => {
            assert.equal(Util.getInstance().trim(""), "");
            assert.equal(Util.getInstance().trim("\t"), "");
            assert.equal(Util.getInstance().trim("\n"), "");
            assert.equal(Util.getInstance().trim("\t\n\r test \t\n\r"), "test");
            assert.equal(
                Util.getInstance().trim("\t\n\r test \t\n\r test \t\n\r"),
                "test \t\n\r test"
            );
        });
    });

    describe("#isArray(obj)", () => {
        it("should detect if an object is an array", () => {
            assert.ok(Util.getInstance().isArray([]));
            assert.ok(!Util.getInstance().isArray("sdf"));
            assert.ok(Util.getInstance().isArray([0, 1]));
            assert.ok(!Util.getInstance().isArray({ length: "" }));
            assert.ok(!Util.getInstance().isArray({ length: 10 }));
        });
    });

    describe("#isError(obj)", () => {
        it("should detect if an object is an instance of Error", () => {
            class MyError extends Error {
                constructor() {
                    super();
                }
            }
            assert.ok(!Util.getInstance().isError(undefined));
            assert.ok(!Util.getInstance().isError(null));
            assert.ok(!Util.getInstance().isError(true));
            assert.ok(!Util.getInstance().isError(1));
            assert.ok(!Util.getInstance().isError(""));
            assert.ok(!Util.getInstance().isError([]));
            assert.ok(!Util.getInstance().isError({}));
            assert.ok(Util.getInstance().isError(new Error()));
            assert.ok(Util.getInstance().isError(new MyError()));
        });
    });

    describe("#msToTimeSpan(totalMs)", () => {
        var test = (input: number, expected: string, message: string) => {
            var actual = Util.getInstance().msToTimeSpan(input);
            assert.equal(expected, actual, message);
        };

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
            test(24 * 60 * 60 * 1000, "1.00:00:00.000", "hours overflow");
            test(11 * 3600000 + 11 * 60000 + 11111, "11:11:11.111", "all digits");
            test(
                5 * 86400000 + 13 * 3600000 + 9 * 60000 + 8 * 1000 + 789,
                "5.13:09:08.789",
                "all digits with days"
            );
            test(1001.505, "00:00:01.001505", "fractional milliseconds");
            test(1001.5, "00:00:01.0015", "fractional milliseconds - not all precision 1");
            test(1001.55, "00:00:01.00155", "fractional milliseconds - not all precision 2");
            test(1001.5059, "00:00:01.0015059", "fractional milliseconds - all digits");
            test(
                1001.50559,
                "00:00:01.0015056",
                "fractional milliseconds - too many digits, round up"
            );
        });

        it("should handle invalid input", () => {
            test(<any>"", "00:00:00.000", "invalid input");
            test(<any>"'", "00:00:00.000", "invalid input");
            test(NaN, "00:00:00.000", "invalid input");
            test(<any>{}, "00:00:00.000", "invalid input");
            test(<any>[], "00:00:00.000", "invalid input");
            test(-1, "00:00:00.000", "invalid input");
        });
    });
});
