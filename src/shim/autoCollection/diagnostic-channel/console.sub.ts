// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import { channel, IStandardEvent, trueFilter } from "diagnostic-channel";
import { console as consolePub } from "diagnostic-channel-publishers";
import { KnownSeverityLevel } from "../../../declarations/generated";
import { TelemetryClient } from "../../telemetryClient";

let clients: TelemetryClient[] = [];

const subscriber = (event: IStandardEvent<consolePub.IConsoleData>) => {
    let message = event.data.message as Error | string;
    clients.forEach((client) => {
        if (message instanceof Error) {
            client.trackException({ exception: message });
        } else {
            // Message can have a trailing newline
            if (message.lastIndexOf("\n") === message.length - 1) {
                message = message.substring(0, message.length - 1);
            }
            client.trackTrace({
                message: message,
                severity: event.data.stderr
                    ? KnownSeverityLevel.Warning
                    : KnownSeverityLevel.Information,
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
            channel.subscribe<consolePub.IConsoleData>("console", subscriber, trueFilter);
        }
        clients.push(client);
    } else {
        clients = clients.filter((c) => c !== client);
        if (clients.length === 0) {
            channel.unsubscribe("console", subscriber);
        }
    }
}

export function dispose() {
    channel.unsubscribe("console", subscriber);
    clients = [];
}
