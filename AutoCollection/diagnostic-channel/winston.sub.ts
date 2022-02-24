// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import { LogHandler } from "../../Library/Handlers/LogHandler";
import { StatsbeatInstrumentation } from "../../Declarations/Constants";
import { SeverityLevel } from "../../Declarations/Contracts";

import { channel, IStandardEvent, trueFilter } from "diagnostic-channel";

import { winston } from "diagnostic-channel-publishers";

let handlers: LogHandler[] = [];

const winstonToAILevelMap: { [key: string]: (og: string) => number } = {
    syslog(og: string) {
        const map: { [key: string]: number } = {
            emerg: SeverityLevel.Critical,
            alert: SeverityLevel.Critical,
            crit: SeverityLevel.Critical,
            error: SeverityLevel.Error,
            warning: SeverityLevel.Warning,
            notice: SeverityLevel.Information,
            info: SeverityLevel.Information,
            debug: SeverityLevel.Verbose
        };

        return map[og] === undefined ? SeverityLevel.Information : map[og];
    },
    npm(og: string) {
        const map: { [key: string]: number } = {
            error: SeverityLevel.Error,
            warn: SeverityLevel.Warning,
            info: SeverityLevel.Information,
            verbose: SeverityLevel.Verbose,
            debug: SeverityLevel.Verbose,
            silly: SeverityLevel.Verbose
        };

        return map[og] === undefined ? SeverityLevel.Information : map[og];
    },
    unknown(og: string) {
        return SeverityLevel.Information;
    }
};

const subscriber = (event: IStandardEvent<winston.IWinstonData>) => {
    const message = event.data.message as Error | string;
    handlers.forEach((handler) => {
        if (message instanceof Error) {
            handler.trackException({
                exception: message,
                properties: event.data.meta
            });
        } else {
            const AIlevel = winstonToAILevelMap[event.data.levelKind](event.data.level);
            handler.trackTrace({
                message: message,
                severity: AIlevel,
                properties: event.data.meta
            });
        }
    });
};

export function enable(enabled: boolean, handler: LogHandler) {
    if (enabled) {
        let handlerFound = handlers.find(c => c == handler);
        if (handlerFound) {
            return;
        }
        if (handlers.length === 0) {
            channel.subscribe<winston.IWinstonData>("winston", subscriber, trueFilter, (module: string, version: string) => {
                if (handler.statsbeat) {
                    handler.statsbeat.addInstrumentation(StatsbeatInstrumentation.WINSTON);
                }
            });
        }
        handlers.push(handler);
    } else {
        handlers = handlers.filter((c) => c != handler);
        if (handlers.length === 0) {
            channel.unsubscribe("winston", subscriber);
        }
    }
}

export function dispose() {
    channel.unsubscribe("winston", subscriber);
    handlers = [];
}