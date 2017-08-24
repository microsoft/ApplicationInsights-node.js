// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import Client = require("../../Library/Client");
import {SeverityLevel} from "../../Declarations/Contracts";

import {channel, IStandardEvent} from "diagnostic-channel";

import {console as consolePub} from "diagnostic-channel-publishers";

let clients: Client[] = [];

const subscriber = (event: IStandardEvent<consolePub.IConsoleData>) => {
    clients.forEach((client) => {
        client.trackTrace({message: event.data.message, severity: (event.data.stderr ? SeverityLevel.Warning : SeverityLevel.Information)});
    });
};

export function enable(enabled: boolean, client: Client) {
    if (enabled) {
        if (clients.length === 0) {
            channel.subscribe<consolePub.IConsoleData>("console", subscriber);
        };
        clients.push(client);
    } else {
        clients = clients.filter((c) => c != client);
        if (clients.length === 0) {
            channel.unsubscribe("console", subscriber);
        }
    }
}