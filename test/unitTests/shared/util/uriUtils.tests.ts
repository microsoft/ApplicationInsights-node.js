// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { safeDecodeURI, safeDecodeURIComponent } from "../../../../src/shared/util/uriUtils";
import assert = require("assert");

describe("UriUtils", () => {
    describe("safeDecodeURI", () => {
        it("should decode valid URI strings", () => {
            const validURI = "https://example.com/test%20path";
            const result = safeDecodeURI(validURI);
            assert.equal(result, "https://example.com/test path");
        });

        it("should decode URI with special characters", () => {
            const uriWithSpecialChars = "https://example.com/test%20%C3%A9%C3%A0%C3%A7";
            const result = safeDecodeURI(uriWithSpecialChars);
            assert.equal(result, "https://example.com/test éàç");
        });

        it("should return default value for malformed URI", () => {
            const malformedURI = "https://example.com/test%ZZ";
            const result = safeDecodeURI(malformedURI);
            assert.equal(result, "");
        });

        it("should return custom default value for malformed URI", () => {
            const malformedURI = "https://example.com/test%ZZ";
            const defaultValue = "fallback";
            const result = safeDecodeURI(malformedURI, defaultValue);
            assert.equal(result, defaultValue);
        });

        it("should return default value for null input", () => {
            const result = safeDecodeURI(null as any);
            assert.equal(result, "");
        });

        it("should return default value for undefined input", () => {
            const result = safeDecodeURI(undefined as any);
            assert.equal(result, "");
        });

        it("should return default value for non-string input", () => {
            const result = safeDecodeURI(123 as any);
            assert.equal(result, "");
        });

        it("should return default value for empty string", () => {
            const result = safeDecodeURI("");
            assert.equal(result, "");
        });

        it("should handle cookie-like strings with malformed URI encoding", () => {
            // This simulates the auth cookie scenario from the original issue
            const malformedCookie = "ai_authUser=user%ZZ|othercookie=value";
            const result = safeDecodeURI(malformedCookie);
            assert.equal(result, "");
        });

        it("should handle valid cookie-like strings", () => {
            const validCookie = "ai_authUser=user%20name|othercookie=value";
            const result = safeDecodeURI(validCookie);
            assert.equal(result, "ai_authUser=user name|othercookie=value");
        });
    });

    describe("safeDecodeURIComponent", () => {
        it("should decode valid URI component strings", () => {
            const validComponent = "test%20component";
            const result = safeDecodeURIComponent(validComponent);
            assert.equal(result, "test component");
        });

        it("should decode URI component with special characters", () => {
            const componentWithSpecialChars = "test%20%C3%A9%C3%A0%C3%A7";
            const result = safeDecodeURIComponent(componentWithSpecialChars);
            assert.equal(result, "test éàç");
        });

        it("should return default value for malformed URI component", () => {
            const malformedComponent = "test%ZZ";
            const result = safeDecodeURIComponent(malformedComponent);
            assert.equal(result, "");
        });

        it("should return custom default value for malformed URI component", () => {
            const malformedComponent = "test%ZZ";
            const defaultValue = "fallback";
            const result = safeDecodeURIComponent(malformedComponent, defaultValue);
            assert.equal(result, defaultValue);
        });

        it("should return default value for null input", () => {
            const result = safeDecodeURIComponent(null as any);
            assert.equal(result, "");
        });

        it("should return default value for undefined input", () => {
            const result = safeDecodeURIComponent(undefined as any);
            assert.equal(result, "");
        });

        it("should return default value for non-string input", () => {
            const result = safeDecodeURIComponent(123 as any);
            assert.equal(result, "");
        });

        it("should return default value for empty string", () => {
            const result = safeDecodeURIComponent("");
            assert.equal(result, "");
        });

        it("should handle various malformed encoding scenarios", () => {
            const malformedScenarios = [
                "test%",
                "test%Z",
                "test%ZZ",
                "test%GG",
                "test%XX",
                "test%1",
                "test%1G"
            ];

            malformedScenarios.forEach(scenario => {
                const result = safeDecodeURIComponent(scenario);
                assert.equal(result, "", `Failed for scenario: ${scenario}`);
            });
        });

        it("should handle auth user cookie value scenarios", () => {
            // These simulate the specific auth cookie scenarios from the original issue
            const authUserScenarios = [
                "user%20name",  // valid
                "user%ZZ",      // malformed
                "user%GG",      // malformed
                "user%",        // malformed
                "user%1",       // malformed
                "",             // empty
                "user name",    // unencoded (should work)
            ];

            const expectedResults = [
                "user name",    // valid case
                "",             // malformed cases return empty string
                "",
                "",
                "",
                "",
                "user name"     // unencoded should pass through
            ];

            authUserScenarios.forEach((scenario, index) => {
                const result = safeDecodeURIComponent(scenario);
                assert.equal(result, expectedResults[index], `Failed for auth user scenario: ${scenario}`);
            });
        });
    });
});