// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import TelemetryClient = require("../../Library/TelemetryClient");
import { StatsBeatInstrumentation } from "../../Declarations/Constants";
import {channel, IStandardEvent} from "diagnostic-channel";

import {mysql} from "diagnostic-channel-publishers";

let clients: TelemetryClient[] = [];

export const subscriber = (event: IStandardEvent<mysql.IMysqlData>) => {
    clients.forEach((client) => {
        const queryObj = event.data.query || {};
        const sqlString = queryObj.sql || "Unknown query";
        const success = !event.data.err;

        const connection = queryObj._connection || {};
        const connectionConfig = connection.config || {};
        const dbName = connectionConfig.socketPath ? connectionConfig.socketPath : `${connectionConfig.host || "localhost"}:${connectionConfig.port}`;
        client.trackDependency(
            {
                target: dbName,
                data: sqlString,
                name: sqlString,
                duration: event.data.duration,
                success: success,
                /* TODO: transmit result code from mysql */
                resultCode: success? "0": "1",
                time: event.data.time,
                dependencyTypeName: "mysql"
            });
    });
};

export function enable(enabled: boolean, client: TelemetryClient) {
    let statsBeat = client.getStatsBeat();
    if (enabled) {
        if (clients.length === 0) {
            channel.subscribe<mysql.IMysqlData>("mysql", subscriber);
            if (statsBeat) {
                statsBeat.addInstrumentation(StatsBeatInstrumentation.MYSQL);
            }
        };
        clients.push(client);
    } else {
        clients = clients.filter((c) => c != client);
        if (clients.length === 0) {
            channel.unsubscribe("mysql", subscriber);
            if (statsBeat) {
                statsBeat.removeInstrumentation(StatsBeatInstrumentation.MYSQL);
            }
        }
    }
}
