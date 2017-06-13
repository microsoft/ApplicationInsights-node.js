// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import Client = require("../../Library/Client");
import {SeverityLevel} from "../../Declarations/Contracts";

import {channel, IStandardEvent} from "diagnostic-channel";

import {bunyan} from "diagnostic-channel-publishers";

let clients: Client[] = [];

// Mapping from bunyan levels defined at https://github.com/trentm/node-bunyan/blob/master/lib/bunyan.js#L256
const bunyanToAILevelMap: {[key: number] : number} = {
    10: SeverityLevel.Verbose,
    20: SeverityLevel.Verbose,
    30: SeverityLevel.Information,
    40: SeverityLevel.Warning,
    50: SeverityLevel.Error,
    60: SeverityLevel.Critical,
};

const subscriber = (event: IStandardEvent<bunyan.IBunyanData>) => {
    clients.forEach((client) => {
        const AIlevel = bunyanToAILevelMap[event.data.level];
        client.trackTrace(event.data.result, AIlevel);
    });
};

export function enable(enabled: boolean, client: Client) {
    if (enabled) {
        if (clients.length === 0) {
            channel.subscribe<bunyan.IBunyanData>("bunyan", subscriber);
        };
        clients.push(client);
    } else {
        clients = clients.filter((c) => c != client);
        if (clients.length === 0) {
            channel.unsubscribe("bunyan", subscriber);
        }
    }
}