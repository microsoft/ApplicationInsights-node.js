// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

// Don't reference modules from these directly. Use only for types.
// This is to avoid requiring the actual module if the NO_DIAGNOSTIC_CHANNEL env is present
import * as DiagChannelPublishers from "diagnostic-channel-publishers";
import * as DiagChannel from "diagnostic-channel";

export const IsInitialized = !process.env["APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL"];

if (IsInitialized) {
    const publishers: typeof DiagChannelPublishers = require("diagnostic-channel-publishers");
    const individualOptOuts = process.env["APPLICATION_INSIGHTS_NO_PATCH_MODULES"] || "";
    const unpatchedModules = individualOptOuts.split(",");
    const modules: {[key: string] : any} = {
        bunyan: publishers.bunyan, 
        console: publishers.console, 
        mongodb: publishers.mongodb,
        mongodbCore: publishers.mongodbCore,
        mysql: publishers.mysql,
        redis: publishers.redis,
        pg: publishers.pg,
        pgPool: publishers.pgPool,
        winston: publishers.winston
    };
    for (const mod in modules) {
        if (unpatchedModules.indexOf(mod) === -1) {
           modules[mod].enable();
        }
    }
}

export function registerContextPreservation(cb: (cb: Function) => Function) {
    if (!IsInitialized) {
        return;
    }

    (require("diagnostic-channel") as typeof DiagChannel).channel.addContextPreservation(cb);
}