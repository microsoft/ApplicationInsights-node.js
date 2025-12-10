// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AZURE_MONITOR_STATSBEAT_FEATURES } from "../../types";
import { StatsbeatFeature, StatsbeatInstrumentation } from "../../shim/types";

/**
 * Interface for statsbeat features configuration
 */
interface StatsbeatFeaturesConfig {
    instrumentation: number;
    feature: number;
}

/**
 * Utility class to manage statsbeat features using bitmap flags
 */
export class StatsbeatFeaturesManager {
    private static instance: StatsbeatFeaturesManager;

    /**
     * Get the singleton instance of StatsbeatFeaturesManager
     */
    public static getInstance(): StatsbeatFeaturesManager {
        if (!StatsbeatFeaturesManager.instance) {
            StatsbeatFeaturesManager.instance = new StatsbeatFeaturesManager();
        }
        return StatsbeatFeaturesManager.instance;
    }

    /**
     * Get the current statsbeat features configuration from environment variable
     */
    private getCurrentConfig(): StatsbeatFeaturesConfig {
        const envValue = process.env[AZURE_MONITOR_STATSBEAT_FEATURES];
        if (envValue) {
            try {
                return JSON.parse(envValue);
            } catch (error) {
                // If parsing fails, return default values
                return {
                    instrumentation: StatsbeatInstrumentation.NONE,
                    feature: StatsbeatFeature.SHIM
                };
            }
        }
        return {
            instrumentation: StatsbeatInstrumentation.NONE,
            feature: StatsbeatFeature.SHIM
        };
    }

    /**
     * Set the statsbeat features environment variable with updated configuration
     */
    private setConfig(config: StatsbeatFeaturesConfig): void {
        process.env[AZURE_MONITOR_STATSBEAT_FEATURES] = JSON.stringify(config);
    }

    /**
     * Enable a specific statsbeat feature by setting the corresponding bit
     */
    public enableFeature(feature: StatsbeatFeature): void {
        const currentConfig = this.getCurrentConfig();
        currentConfig.feature |= feature; // Use bitwise OR to set the bit
        this.setConfig(currentConfig);
    }

    /**
     * Disable a specific statsbeat feature by clearing the corresponding bit
     */
    public disableFeature(feature: StatsbeatFeature): void {
        const currentConfig = this.getCurrentConfig();
        currentConfig.feature &= ~feature; // Use bitwise AND with NOT to clear the bit
        this.setConfig(currentConfig);
    }

    /**
     * Check if a specific statsbeat feature is enabled
     */
    public isFeatureEnabled(feature: StatsbeatFeature): boolean {
        const currentConfig = this.getCurrentConfig();
        return (currentConfig.feature & feature) !== 0;
    }

    /**
     * Enable a specific statsbeat instrumentation by setting the corresponding bit
     */
    public enableInstrumentation(instrumentation: StatsbeatInstrumentation): void {
        const currentConfig = this.getCurrentConfig();
        currentConfig.instrumentation |= instrumentation; // Use bitwise OR to set the bit
        this.setConfig(currentConfig);
    }

    /**
     * Disable a specific statsbeat instrumentation by clearing the corresponding bit
     */
    public disableInstrumentation(instrumentation: StatsbeatInstrumentation): void {
        const currentConfig = this.getCurrentConfig();
        currentConfig.instrumentation &= ~instrumentation; // Use bitwise AND with NOT to clear the bit
        this.setConfig(currentConfig);
    }

    /**
     * Check if a specific statsbeat instrumentation is enabled
     */
    public isInstrumentationEnabled(instrumentation: StatsbeatInstrumentation): boolean {
        const currentConfig = this.getCurrentConfig();
        return (currentConfig.instrumentation & instrumentation) !== 0;
    }

    /**
     * Initialize the statsbeat features environment variable with default values if not set
     */
    public initialize(): void {
        if (!process.env[AZURE_MONITOR_STATSBEAT_FEATURES]) {
            this.setConfig({
                instrumentation: StatsbeatInstrumentation.NONE,
                feature: StatsbeatFeature.SHIM
            });
        }
    }
}
