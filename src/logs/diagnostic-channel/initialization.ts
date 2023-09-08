// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

// Don't reference modules from these directly. Use only for types.
import * as DiagChannelPublishers from "diagnostic-channel-publishers";
import { Logger } from "../../shared/logging";
import { ShimJsonConfig } from "../../shim/shim-jsonConfig";

const TAG = "DiagnosticChannel";
let isInitialized = false;

export function enablePublishers() {
    // Only register monkey patchs once
    if (!isInitialized) {
        isInitialized = true;
        const individualOptOuts: string = ShimJsonConfig.getInstance().noPatchModules;
        const unpatchedModules: string[] = individualOptOuts ? individualOptOuts.split(",") : [];
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const publishers: typeof DiagChannelPublishers = require("diagnostic-channel-publishers");
        const modules: { [key: string]: any } = {
            bunyan: publishers.bunyan,
            console: publishers.console,
            winston: publishers.winston,
        };

        if (ShimJsonConfig.getInstance().noDiagnosticChannel !== true) {
            for (const mod in modules) {
                if (unpatchedModules.indexOf(mod) === -1) {
                    modules[mod].enable();
                    Logger.getInstance().info(TAG, `Subscribed to ${mod} events`);
                }
            }
            if (unpatchedModules.length > 0) {
                Logger.getInstance().info(TAG, `Some modules were not patched: ${unpatchedModules}`);
            }
        } else {
            Logger.getInstance().info(TAG, "Not subscribing to diagnostic channels because APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL was set");
        }
    }
}
