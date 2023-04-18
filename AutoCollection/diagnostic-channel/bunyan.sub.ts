// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import TelemetryClient = require("../../Library/TelemetryClient");
import { SeverityLevel } from "../../Declarations/Contracts";
import { StatsbeatInstrumentation } from "../../Declarations/Constants";

import { channel, IStandardEvent, trueFilter } from "diagnostic-channel";

import { bunyan } from "diagnostic-channel-publishers";

let clients: TelemetryClient[] = [];

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
    clients.forEach((client) => {
        // For now, we will simply log everything as a trace.
        //   The older 1.8.x code would actually never log an
        //   exception anyway since message was NEVER of type
        //   Error(shown here):
        //
        // var subscriber = function (event) {
        //     var message = event.data.result;
        //     clients.forEach(function (client) {
        //         var AIlevel = bunyanToAILevelMap[event.data.level];
        //         if (message instanceof Error) {
        //             client.trackException({ exception: (message) });
        //         }
        //         else {
        //             client.trackTrace({ message: message, severity: AIlevel });
        //         }
        //     });
        // };
        
        // The way this code is written effectively breaks the Bunyan interface.
        //   For now, bypass writing any exceptions.
        //   For example, additional error detail is lost if you supplied a custom message.
        //   https://github.com/trentm/node-bunyan#log-method-api
        /*
        try {
            // Try to parse message as Bunyan log is JSON
            let log: any = JSON.parse(message);
            if (log.err) {
                let bunyanError = new Error(log.err.message);
                bunyanError.name = log.err.name;
                bunyanError.stack = log.err.stack;
                client.trackException({ exception: bunyanError });
                return;
            }
        }
        catch (err) {
            // Ignore error
        }
        */
        const AIlevel = bunyanToAILevelMap[event.data.level];
        client.trackTrace({ message: message, severity: AIlevel });
    });
};

export function enable(enabled: boolean, client: TelemetryClient) {
    if (enabled) {
        let clientFound = clients.find(c => c == client);
        if (clientFound) {
            return;
        }
        if (clients.length === 0) {
            channel.subscribe<bunyan.IBunyanData>("bunyan", subscriber, trueFilter, (module, version) => {
                let statsbeat = client.getStatsbeat();
                if (statsbeat) {
                    statsbeat.addInstrumentation(StatsbeatInstrumentation.BUNYAN);
                }
            });
        }
        clients.push(client);
    } else {
        clients = clients.filter((c) => c != client);
        if (clients.length === 0) {
            channel.unsubscribe("bunyan", subscriber);
        }
    }
}

export function dispose() {
    channel.unsubscribe("bunyan", subscriber);
    clients = [];
}
