// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as assert from "assert";
import { StatsbeatFeaturesManager } from "../../../../src/shared/util/statsbeatFeaturesManager";
import { StatsbeatFeature, StatsbeatInstrumentation } from "../../../../src/shim/types";

describe("shared/util/StatsbeatFeaturesManager", () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        // Save original environment
        originalEnv = { ...process.env };
        // Clear the AZURE_MONITOR_STATSBEAT_FEATURES environment variable before each test
        delete process.env["AZURE_MONITOR_STATSBEAT_FEATURES"];
    });

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv;
    });

    describe("initialize", () => {
        it("should initialize environment variable with default values when not set", () => {
            StatsbeatFeaturesManager.getInstance().initialize();
            
            const envValue = process.env["AZURE_MONITOR_STATSBEAT_FEATURES"];
            assert.ok(envValue, "AZURE_MONITOR_STATSBEAT_FEATURES should be set after initialization");
            
            const config = JSON.parse(envValue);
            assert.strictEqual(config.instrumentation, StatsbeatInstrumentation.NONE, "instrumentation should default to NONE");
            assert.strictEqual(config.feature, StatsbeatFeature.SHIM, "feature should default to SHIM");
        });

        it("should not overwrite existing environment variable", () => {
            const existingValue = JSON.stringify({
                instrumentation: StatsbeatInstrumentation.MONGODB,
                feature: StatsbeatFeature.LIVE_METRICS
            });
            process.env["AZURE_MONITOR_STATSBEAT_FEATURES"] = existingValue;
            
            StatsbeatFeaturesManager.getInstance().initialize();
            
            assert.strictEqual(process.env["AZURE_MONITOR_STATSBEAT_FEATURES"], existingValue, "existing value should not be overwritten");
        });
    });

    describe("enableFeature", () => {
        it("should enable MULTI_IKEY feature using bitmap", () => {
            StatsbeatFeaturesManager.getInstance().initialize();
            StatsbeatFeaturesManager.getInstance().enableFeature(StatsbeatFeature.MULTI_IKEY);
            
            const envValue = process.env["AZURE_MONITOR_STATSBEAT_FEATURES"];
            assert.ok(envValue, "environment variable should be set");
            
            const config = JSON.parse(envValue);
            assert.ok((config.feature & StatsbeatFeature.MULTI_IKEY) !== 0, "MULTI_IKEY feature should be enabled");
            assert.ok((config.feature & StatsbeatFeature.SHIM) !== 0, "SHIM feature should remain enabled");
        });

        it("should enable CUSTOMER_STATSBEAT feature using bitmap", () => {
            StatsbeatFeaturesManager.getInstance().initialize();
            StatsbeatFeaturesManager.getInstance().enableFeature(StatsbeatFeature.CUSTOMER_STATSBEAT);
            
            const envValue = process.env["AZURE_MONITOR_STATSBEAT_FEATURES"];
            assert.ok(envValue, "environment variable should be set");
            
            const config = JSON.parse(envValue);
            assert.ok((config.feature & StatsbeatFeature.CUSTOMER_STATSBEAT) !== 0, "CUSTOMER_STATSBEAT feature should be enabled");
            assert.ok((config.feature & StatsbeatFeature.SHIM) !== 0, "SHIM feature should remain enabled");
        });

        it("should enable multiple features using bitmap", () => {
            StatsbeatFeaturesManager.getInstance().initialize();
            StatsbeatFeaturesManager.getInstance().enableFeature(StatsbeatFeature.MULTI_IKEY);
            StatsbeatFeaturesManager.getInstance().enableFeature(StatsbeatFeature.LIVE_METRICS);
            
            const envValue = process.env["AZURE_MONITOR_STATSBEAT_FEATURES"];
            assert.ok(envValue, "environment variable should be set");
            
            const config = JSON.parse(envValue);
            assert.ok((config.feature & StatsbeatFeature.MULTI_IKEY) !== 0, "MULTI_IKEY feature should be enabled");
            assert.ok((config.feature & StatsbeatFeature.LIVE_METRICS) !== 0, "LIVE_METRICS feature should be enabled");
            assert.ok((config.feature & StatsbeatFeature.SHIM) !== 0, "SHIM feature should remain enabled");
        });
    });

    describe("disableFeature", () => {
        it("should disable specific feature using bitmap", () => {
            StatsbeatFeaturesManager.getInstance().initialize();
            StatsbeatFeaturesManager.getInstance().enableFeature(StatsbeatFeature.MULTI_IKEY);
            StatsbeatFeaturesManager.getInstance().enableFeature(StatsbeatFeature.LIVE_METRICS);
            
            // Disable only MULTI_IKEY
            StatsbeatFeaturesManager.getInstance().disableFeature(StatsbeatFeature.MULTI_IKEY);
            
            const envValue = process.env["AZURE_MONITOR_STATSBEAT_FEATURES"];
            assert.ok(envValue, "environment variable should be set");
            
            const config = JSON.parse(envValue);
            assert.strictEqual((config.feature & StatsbeatFeature.MULTI_IKEY), 0, "MULTI_IKEY feature should be disabled");
            assert.ok((config.feature & StatsbeatFeature.LIVE_METRICS) !== 0, "LIVE_METRICS feature should remain enabled");
            assert.ok((config.feature & StatsbeatFeature.SHIM) !== 0, "SHIM feature should remain enabled");
        });
    });

    describe("isFeatureEnabled", () => {
        it("should correctly detect enabled features", () => {
            StatsbeatFeaturesManager.getInstance().initialize();
            
            assert.ok(StatsbeatFeaturesManager.getInstance().isFeatureEnabled(StatsbeatFeature.SHIM), "SHIM should be enabled by default");
            assert.ok(!StatsbeatFeaturesManager.getInstance().isFeatureEnabled(StatsbeatFeature.MULTI_IKEY), "MULTI_IKEY should not be enabled by default");
            
            StatsbeatFeaturesManager.getInstance().enableFeature(StatsbeatFeature.MULTI_IKEY);
            assert.ok(StatsbeatFeaturesManager.getInstance().isFeatureEnabled(StatsbeatFeature.MULTI_IKEY), "MULTI_IKEY should be enabled after enableFeature");
        });
    });

    describe("instrumentation management", () => {
        it("should enable and disable instrumentation features", () => {
            StatsbeatFeaturesManager.getInstance().initialize();
            
            assert.ok(!StatsbeatFeaturesManager.getInstance().isInstrumentationEnabled(StatsbeatInstrumentation.MONGODB), "MONGODB should not be enabled by default");
            
            StatsbeatFeaturesManager.getInstance().enableInstrumentation(StatsbeatInstrumentation.MONGODB);
            assert.ok(StatsbeatFeaturesManager.getInstance().isInstrumentationEnabled(StatsbeatInstrumentation.MONGODB), "MONGODB should be enabled after enableInstrumentation");
            
            StatsbeatFeaturesManager.getInstance().disableInstrumentation(StatsbeatInstrumentation.MONGODB);
            assert.ok(!StatsbeatFeaturesManager.getInstance().isInstrumentationEnabled(StatsbeatInstrumentation.MONGODB), "MONGODB should be disabled after disableInstrumentation");
        });
    });

    describe("error handling", () => {
        it("should handle malformed JSON in environment variable", () => {
            process.env["AZURE_MONITOR_STATSBEAT_FEATURES"] = "invalid json";
            
            // Should not throw and should return default values
            assert.ok(!StatsbeatFeaturesManager.getInstance().isFeatureEnabled(StatsbeatFeature.MULTI_IKEY), "should handle malformed JSON gracefully");
            
            // Should be able to enable features despite malformed initial value
            StatsbeatFeaturesManager.getInstance().enableFeature(StatsbeatFeature.MULTI_IKEY);
            assert.ok(StatsbeatFeaturesManager.getInstance().isFeatureEnabled(StatsbeatFeature.MULTI_IKEY), "should be able to enable features after handling malformed JSON");
        });
    });
});
