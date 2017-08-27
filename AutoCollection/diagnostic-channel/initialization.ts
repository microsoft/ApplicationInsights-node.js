// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

import {bunyan, console as consoleModule, mongodb, mongodbCore, mysql, redis, pg, pgPool, winston} from "diagnostic-channel-publishers";

if (!process.env["APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL"]) {
    const individualOptOuts = process.env["APPLICATION_INSIGHTS_NO_PATCH_MODULES"] || "";
    const unpatchedModules = individualOptOuts.split(",");
    const modules: {[key: string] : any} = {bunyan, console: consoleModule, mongodb, mongodbCore, mysql, redis, pg, pgPool, winston};
    for (const mod in modules) {
        if (unpatchedModules.indexOf(mod) === -1) {
           modules[mod].enable();
        }
    }
}