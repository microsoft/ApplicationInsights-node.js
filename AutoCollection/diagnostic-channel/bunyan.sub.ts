// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import { channel, IStandardEvent, trueFilter } from "diagnostic-channel";
import { bunyan } from "diagnostic-channel-publishers";

import { LogHandler } from "../../Library/Handlers/LogHandler";
import { SeverityLevel } from "../../Declarations/Contracts";
import { StatsbeatInstrumentation } from "../../Declarations/Constants";

let handlers: LogHandler[] = [];

// Mapping from bunyan levels defined at https://github.com/trentm/node-bunyan/blob/master/lib/bunyan.js#L256
const bunyanToAILevelMap: { [key: number]: number } = {
    10: SeverityLevel.Verbose,
    20: SeverityLevel.Verbose,
    30: SeverityLevel.Information,
    40: SeverityLevel.Warning,
    50: SeverityLevel.Error,
    60: SeverityLevel.Critical
};

const subscriber = (event: IStandardEvent<bunyan.IBunyanData>) => {
    let message = event.data.result as string;
    handlers.forEach((handler) => {
        try {
            // Try to parse message as Bunyan log is JSON
            let log: any = JSON.parse(message);
            if (log.err) {
                handler.trackException({ exception: log.err });
                return;
            }
        }
        catch (ex) {
            // Ignore error
        }
        const AIlevel = bunyanToAILevelMap[event.data.level];
        handler.trackTrace({ message: message, severity: AIlevel });
    });
};

export function enable(enabled: boolean, handler: LogHandler) {
    if (enabled) {
        let handlerFound = handlers.find(c => c == handler);
        if (handlerFound) {
            return;
        }
        if (handlers.length === 0) {
            channel.subscribe<bunyan.IBunyanData>("bunyan", subscriber, trueFilter, (module, version) => {
                if (handler.statsbeat) {
                    handler.statsbeat.addInstrumentation(StatsbeatInstrumentation.BUNYAN);
                }
            });
        }
        handlers.push(handler);
    } else {
        handlers = handlers.filter((c) => c != handler);
        if (handlers.length === 0) {
            channel.unsubscribe("bunyan", subscriber);
        }
    }
}

export function dispose() {
    channel.unsubscribe("bunyan", subscriber);
    handlers = [];
}
