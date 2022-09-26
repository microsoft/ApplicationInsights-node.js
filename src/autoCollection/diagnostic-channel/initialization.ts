// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

// Don't reference modules from these directly. Use only for types.
import * as DiagChannelPublishers from "diagnostic-channel-publishers";
import { Logger } from "../../library/logging";

const TAG = "DiagnosticChannel";
let isInitialized = false;


export function enablePublishers() {
    // Only register monkey patchs once
    if (!isInitialized) {
        isInitialized = true;
        const publishers: typeof DiagChannelPublishers = require("diagnostic-channel-publishers");
        const modules: { [key: string]: any } = {
            bunyan: publishers.bunyan,
            console: publishers.console,
            winston: publishers.winston
        };

        for (const mod in modules) {
            modules[mod].enable();
            Logger.getInstance().info(TAG, `Subscribed to ${mod} events`);
        }
    }
}
