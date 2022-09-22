// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

// Don't reference modules from these directly. Use only for types.
import * as DiagChannelPublishers from "diagnostic-channel-publishers";
import * as DiagChannel from "diagnostic-channel";
import { Logger } from "../../library/logging";

const TAG = "DiagnosticChannel";

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
export function registerContextPreservation(cb: (cb: Function) => Function) {
    const diagChannel = require("diagnostic-channel") as typeof DiagChannel;
    diagChannel.channel.addContextPreservation(cb);
}
