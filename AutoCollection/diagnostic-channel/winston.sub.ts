// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import TelemetryClient = require("../../Library/TelemetryClient");
import { StatsbeatInstrumentation } from "../../Declarations/Constants";
import { SeverityLevel } from "../../Declarations/Contracts";

import { channel, IStandardEvent, trueFilter } from "diagnostic-channel";

import { winston } from "diagnostic-channel-publishers";

let clients: TelemetryClient[] = [];

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
    const AIlevel = winstonToAILevelMap[event.data.levelKind](event.data.level);
    clients.forEach((client) => {
        if (message instanceof Error && !client.config.enableConsoleErrorToTrace) {
            client.trackException({
                exception: message,
                properties: event.data.meta
            });    
        } else if (message instanceof Error) {
            client.trackTrace({
                message: message.toString(),
                severity: AIlevel,
                properties: event.data.meta
            });
        } else {
            client.trackTrace({
                message: message,
                severity: AIlevel,
                properties: event.data.meta
            });
        }
    });
};

export function enable(enabled: boolean, client: TelemetryClient) {
    if (enabled) {
        let clientFound = clients.find(c => c == client);
        if (clientFound) {
            return;
        }
        if (clients.length === 0) {
            channel.subscribe<winston.IWinstonData>("winston", subscriber, trueFilter, (module, version) => {
                let statsbeat = client.getStatsbeat();
                if (statsbeat) {
                    statsbeat.addInstrumentation(StatsbeatInstrumentation.WINSTON);
                }
            });
        }
        clients.push(client);
    } else {
        clients = clients.filter((c) => c != client);
        if (clients.length === 0) {
            channel.unsubscribe("winston", subscriber);
        }
    }
}

export function dispose() {
    channel.unsubscribe("winston", subscriber);
    clients = [];
}