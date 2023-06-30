// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Util } from "../../../shim/util";
import { IAgentLogger } from "../../types";

export class ConsoleWriter implements IAgentLogger {
    log(message?: any, ...optional: any[]) {
        console.log(Util.getInstance().stringify(message));
    }

    error(message?: any, ...optional: any[]) {
        console.error(Util.getInstance().stringify(message));
    }
}
