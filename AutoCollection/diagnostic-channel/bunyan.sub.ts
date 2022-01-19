// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import TelemetryClient = require("../../Library/TelemetryClient");
import { SeverityLevel } from "../../Declarations/Contracts";
import { StatsbeatInstrumentation } from "../../Declarations/Constants";

import { channel, IStandardEvent } from "diagnostic-channel";

import { bunyan } from "diagnostic-channel-publishers";

let clients: TelemetryClient[] = [];

// Mapping from bunyan levels defined at https://github.com/trentm/node-bunyan/blob/master/lib/bunyan.js#L256
const bunyanToAILevelMap: { [key: number]: number } = {
    10: SeverityLevel.Verbose,
    20: SeverityLevel.Verbose,
    30: SeverityLevel.Information,
    40: SeverityLevel.Warning,
    50: SeverityLevel.Error,
    60: SeverityLevel.Critical,
};

const subscriber = (event: IStandardEvent<bunyan.IBunyanData>) => {
    let message = event.data.result as string;
    clients.forEach((client) => {
        try {
            // Try to parse message as Bunyan log is JSON
            let log: any = JSON.parse(message);
            if (log.err) {
                client.trackException({ exception: log.err });
                return;
            }
        }
        catch (err) { }
        const AIlevel = bunyanToAILevelMap[event.data.level];
        client.trackTrace({ message: message, severity: AIlevel });
    });
};

export function enable(enabled: boolean, client: TelemetryClient) {
    let statsbeat = client.getStatsbeat();
    if (enabled) {
        let clientFound = clients.find(c => c == client);
        if (clientFound) {
            return;
        }
        if (clients.length === 0) {
            channel.subscribe<bunyan.IBunyanData>("bunyan", subscriber);
            if (statsbeat) {
                statsbeat.addInstrumentation(StatsbeatInstrumentation.BUNYAN);
            }
        };
        clients.push(client);
    } else {
        clients = clients.filter((c) => c != client);
        if (clients.length === 0) {
            channel.unsubscribe("bunyan", subscriber);
            if (statsbeat) {
                statsbeat.removeInstrumentation(StatsbeatInstrumentation.BUNYAN);
            }
        }
    }
}

export function dispose() {
    channel.unsubscribe("bunyan", subscriber);
    clients = [];
}
