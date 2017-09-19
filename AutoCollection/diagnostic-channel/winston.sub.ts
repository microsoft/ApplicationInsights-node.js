// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import TelemetryClient = require("../../Library/TelemetryClient");
import { SeverityLevel } from "../../Declarations/Contracts";

import { channel, IStandardEvent } from "diagnostic-channel";

import { winston } from "diagnostic-channel-publishers";

let clients: TelemetryClient[] = [];

const winstonToAILevelMap: { [key: string]: (og: string) => number } = {
    syslog(og: string) {
        return {
            emerg: SeverityLevel.Critical,
            alert: SeverityLevel.Critical,
            crit: SeverityLevel.Critical,
            error: SeverityLevel.Error,
            warning: SeverityLevel.Warning,
            notice: SeverityLevel.Information,
            info: SeverityLevel.Information,
            debug: SeverityLevel.Verbose
        }[og] || SeverityLevel.Information;
    },
    npm(og: string) {
        return {
            error: SeverityLevel.Error,
            warn: SeverityLevel.Warning,
            info: SeverityLevel.Information,
            verbose: SeverityLevel.Verbose,
            debug: SeverityLevel.Verbose,
            silly: SeverityLevel.Verbose
        }[og] || SeverityLevel.Information;
    },
    unknown(og: string) {
        return SeverityLevel.Information;
    }
};

const subscriber = (event: IStandardEvent<winston.IWinstonData>) => {
    clients.forEach((client) => {
        const AIlevel = winstonToAILevelMap[event.data.levelKind](event.data.level);
        client.trackTrace(
            {
                message: event.data.message,
                severity: AIlevel,
                properties: event.data.meta
            });
    });
};

export function enable(enabled: boolean, client: TelemetryClient) {
    if (enabled) {
        if (clients.length === 0) {
            channel.subscribe<winston.IWinstonData>("winston", subscriber);
        };
        clients.push(client);
    } else {
        clients = clients.filter((c) => c != client);
        if (clients.length === 0) {
            channel.unsubscribe("winston", subscriber);
        }
    }
}
