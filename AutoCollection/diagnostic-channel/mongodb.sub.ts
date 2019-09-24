// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import TelemetryClient = require("../../Library/TelemetryClient");
import { channel, IStandardEvent } from "diagnostic-channel";

import { mongodb } from "diagnostic-channel-publishers";

let clients: TelemetryClient[] = [];

export const subscriber = (event: IStandardEvent<mongodb.IMongoData>) => {
    const dbName = (event.data.startedData && event.data.startedData.databaseName) || "Unknown database";
    clients.forEach((client) => {
        const data = client.config.enhancedDependencyCollection
            && event.data.startedData.command
            && event.data.startedData.command[event.data.event.commandName]
            ? JSON.stringify(event.data.startedData.command[event.data.event.commandName])
            : event.data.event.commandName;
        client.trackDependency(
            {
                target: dbName,
                data: data,
                name: event.data.event.commandName,
                duration: event.data.event.duration,
                success: event.data.succeeded,
                /* TODO: transmit result code from mongo */
                resultCode: event.data.succeeded ? "0" : "1",
                dependencyTypeName: 'mongodb'
            });
    });
};

export function enable(enabled: boolean, client: TelemetryClient) {
    if (enabled) {
        if (clients.length === 0) {
            channel.subscribe<mongodb.IMongoData>("mongodb", subscriber);
        };
        clients.push(client);
    } else {
        clients = clients.filter((c) => c != client);
        if (clients.length === 0) {
            channel.unsubscribe("mongodb", subscriber);
        }
    }
}

export function dispose() {
    channel.unsubscribe("mongodb", subscriber);
    clients = [];
}
