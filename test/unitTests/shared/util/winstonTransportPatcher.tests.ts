import * as assert from "assert";
import { WinstonTransportPatcher } from "../../../../src/shared/util/winstonTransportPatcher";

describe("WinstonTransportPatcher", () => {
    describe("sanitizeAttributeValue", () => {
        it("should keep primitive values as-is", () => {
            // Access the private method for testing via any cast
            const patcher = WinstonTransportPatcher as any;
            
            assert.strictEqual(patcher.sanitizeAttributeValue("string"), "string");
            assert.strictEqual(patcher.sanitizeAttributeValue(42), 42);
            assert.strictEqual(patcher.sanitizeAttributeValue(true), true);
            assert.strictEqual(patcher.sanitizeAttributeValue(false), false);
            assert.strictEqual(patcher.sanitizeAttributeValue(null), null);
            assert.strictEqual(patcher.sanitizeAttributeValue(undefined), undefined);
        });

        it("should keep homogeneous primitive arrays as-is", () => {
            const patcher = WinstonTransportPatcher as any;
            
            assert.deepStrictEqual(patcher.sanitizeAttributeValue([1, 2, 3]), [1, 2, 3]);
            assert.deepStrictEqual(patcher.sanitizeAttributeValue(["a", "b", "c"]), ["a", "b", "c"]);
            assert.deepStrictEqual(patcher.sanitizeAttributeValue([true, false]), [true, false]);
        });

        it("should stringify arrays containing objects", () => {
            const patcher = WinstonTransportPatcher as any;
            
            const arrayOfObjects = [{a: "b"}, {c: "d"}];
            const result = patcher.sanitizeAttributeValue(arrayOfObjects);
            assert.strictEqual(result, JSON.stringify(arrayOfObjects));
        });

        it("should stringify mixed type arrays", () => {
            const patcher = WinstonTransportPatcher as any;
            
            const mixedArray = [1, "string", {obj: "value"}];
            const result = patcher.sanitizeAttributeValue(mixedArray);
            assert.strictEqual(result, JSON.stringify(mixedArray));
        });

        it("should stringify objects", () => {
            const patcher = WinstonTransportPatcher as any;
            
            const obj = {level1: {level2: "value"}};
            const result = patcher.sanitizeAttributeValue(obj);
            assert.strictEqual(result, JSON.stringify(obj));
        });

        it("should handle Uint8Array correctly", () => {
            const patcher = WinstonTransportPatcher as any;
            
            const byteArray = new Uint8Array([1, 2, 3]);
            const result = patcher.sanitizeAttributeValue(byteArray);
            assert.strictEqual(result, byteArray); // Should keep as-is
        });
    });

    describe("isValidPrimitiveArray", () => {
        it("should return true for empty arrays", () => {
            const patcher = WinstonTransportPatcher as any;
            assert.strictEqual(patcher.isValidPrimitiveArray([]), true);
        });

        it("should return true for homogeneous primitive arrays", () => {
            const patcher = WinstonTransportPatcher as any;
            assert.strictEqual(patcher.isValidPrimitiveArray([1, 2, 3]), true);
            assert.strictEqual(patcher.isValidPrimitiveArray(["a", "b"]), true);
            assert.strictEqual(patcher.isValidPrimitiveArray([true, false]), true);
        });

        it("should return false for arrays containing objects", () => {
            const patcher = WinstonTransportPatcher as any;
            assert.strictEqual(patcher.isValidPrimitiveArray([{a: 1}]), false);
            assert.strictEqual(patcher.isValidPrimitiveArray([1, {a: 1}]), false);
        });

        it("should return false for mixed type arrays", () => {
            const patcher = WinstonTransportPatcher as any;
            assert.strictEqual(patcher.isValidPrimitiveArray([1, "string"]), false);
            assert.strictEqual(patcher.isValidPrimitiveArray([true, 1]), false);
        });

        it("should handle null/undefined elements correctly", () => {
            const patcher = WinstonTransportPatcher as any;
            assert.strictEqual(patcher.isValidPrimitiveArray([1, null, 2]), true);
            assert.strictEqual(patcher.isValidPrimitiveArray([null, undefined]), true);
            assert.strictEqual(patcher.isValidPrimitiveArray(["a", null, "b"]), true);
        });
    });
});