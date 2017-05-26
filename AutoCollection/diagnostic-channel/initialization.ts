// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

import {bunyan, console as consoleModule, mongodb, mysql, redis} from "diagnostic-channel-publishers";

if (!process.env["APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL"]) {
    const individualOptOuts = process.env["APPLICATION_INSIGHTS_NO_PATCH_MODULES"] || "";
    const unpatchedModules = individualOptOuts.split(",");
    const modules = {bunyan, console: consoleModule, mongodb, mysql, redis};
    for (const mod in modules) {
        if (unpatchedModules.indexOf(mod) === -1) {
           modules[mod].enable();
        }
    }
}