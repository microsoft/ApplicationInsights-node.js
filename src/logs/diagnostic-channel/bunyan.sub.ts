// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import { channel, IStandardEvent, trueFilter } from "diagnostic-channel";
import { bunyan } from "diagnostic-channel-publishers";
import { KnownSeverityLevel } from "../../declarations/generated";
import { LogApi } from "../api";

let clients: LogApi[] = [];

// Mapping from bunyan levels defined at https://github.com/trentm/node-bunyan/blob/master/lib/bunyan.js#L256
const bunyanToAILevelMap: { [key: number]: string } = {
    10: KnownSeverityLevel.Verbose,
    20: KnownSeverityLevel.Verbose,
    30: KnownSeverityLevel.Information,
    40: KnownSeverityLevel.Warning,
    50: KnownSeverityLevel.Error,
    60: KnownSeverityLevel.Critical,
};

const subscriber = (event: IStandardEvent<bunyan.IBunyanData>) => {
    const message = event.data.result as string;
    clients.forEach((client) => {
        try {
            // Try to parse message as Bunyan log is JSON
            const log: any = JSON.parse(message);
            if (log.err) {
                client.trackException({ exception: log.err });
                return;
            }
        } catch (ex) {
            // Ignore error
        }
        const AIlevel = bunyanToAILevelMap[event.data.level];
        client.trackTrace({ message: message, severity: AIlevel });
    });
};

export function enable(enabled: boolean, client: LogApi) {
    if (enabled) {
        const handlerFound = clients.find((c) => c === client);
        if (handlerFound) {
            return;
        }
        if (clients.length === 0) {
            channel.subscribe<bunyan.IBunyanData>("bunyan", subscriber, trueFilter);
        }
        clients.push(client);
    } else {
        clients = clients.filter((c) => c !== client);
        if (clients.length === 0) {
            channel.unsubscribe("bunyan", subscriber);
        }
    }
}

export function dispose() {
    channel.unsubscribe("bunyan", subscriber);
    clients = [];
}