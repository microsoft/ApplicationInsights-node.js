// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import { channel, IStandardEvent, trueFilter } from "diagnostic-channel";
import { winston } from "diagnostic-channel-publishers";
import { KnownSeverityLevel } from "../../../declarations/generated";
import { TelemetryClient } from "../../telemetryClient";

let clients: TelemetryClient[] = [];

const winstonToAILevelMap: { [key: string]: (og: string) => string } = {
    syslog(og: string) {
        const map: { [key: string]: string } = {
            emerg: KnownSeverityLevel.Critical,
            alert: KnownSeverityLevel.Critical,
            crit: KnownSeverityLevel.Critical,
            error: KnownSeverityLevel.Error,
            warning: KnownSeverityLevel.Warning,
            notice: KnownSeverityLevel.Information,
            info: KnownSeverityLevel.Information,
            debug: KnownSeverityLevel.Verbose,
        };

        return map[og] === undefined ? KnownSeverityLevel.Information : map[og];
    },
    npm(og: string) {
        const map: { [key: string]: string } = {
            error: KnownSeverityLevel.Error,
            warn: KnownSeverityLevel.Warning,
            info: KnownSeverityLevel.Information,
            verbose: KnownSeverityLevel.Verbose,
            debug: KnownSeverityLevel.Verbose,
            silly: KnownSeverityLevel.Verbose,
        };

        return map[og] === undefined ? KnownSeverityLevel.Information : map[og];
    },
    unknown(og: string) {
        return KnownSeverityLevel.Information;
    },
};

const subscriber = (event: IStandardEvent<winston.IWinstonData>) => {
    const message = event.data.message as Error | string;
    clients.forEach((client) => {
        if (message instanceof Error) {
            client.trackException({
                exception: message,
                properties: event.data.meta,
            });
        } else {
            const AIlevel = winstonToAILevelMap[event.data.levelKind](event.data.level);
            client.trackTrace({
                message: message,
                severity: AIlevel,
                properties: event.data.meta,
            });
        }
    });
};

export function enable(enabled: boolean, client: TelemetryClient) {
    if (enabled) {
        const handlerFound = clients.find((c) => c === client);
        if (handlerFound) {
            return;
        }
        if (clients.length === 0) {
            channel.subscribe<winston.IWinstonData>("winston", subscriber, trueFilter);
        }
        clients.push(client);
    } else {
        clients = clients.filter((c) => c !== client);
        if (clients.length === 0) {
            channel.unsubscribe("winston", subscriber);
        }
    }
}

export function dispose() {
    channel.unsubscribe("winston", subscriber);
    clients = [];
}
