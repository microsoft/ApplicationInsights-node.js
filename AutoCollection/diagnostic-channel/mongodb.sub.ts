// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import Client = require("../../Library/Client");
import { channel, IStandardEvent } from "diagnostic-channel";

import { mongodb } from "diagnostic-channel-publishers";

let clients: Client[] = [];

export const subscriber = (event: IStandardEvent<mongodb.IMongoData>) => {
    clients.forEach((client) => {
        const dbName = (event.data.startedData && event.data.startedData.databaseName) || "Unknown database";
        client.trackDependency(
            {
                target: dbName,
                data: event.data.event.commandName,
                name: event.data.event.commandName,
                duration: event.data.event.duration,
                success: event.data.succeeded,
                /* TODO: transmit result code from mongo */
                resultCode: event.data.succeeded ? "0" : "1",
                dependencyTypeName: 'mongodb'
            });

        if (!event.data.succeeded) {
            client.trackException({exception:new Error(event.data.event.failure)});
        }
    });
};

export function enable(enabled: boolean, client: Client) {
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