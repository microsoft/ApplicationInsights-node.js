// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IAgentLogger } from "../../types";

export class ConsoleWriter implements IAgentLogger {
    log(message?: any, ...optional: any[]) {
        console.log(JSON.stringify(message));
    }

    error(message?: any, ...optional: any[]) {
        console.error(JSON.stringify(message));
    }
}
