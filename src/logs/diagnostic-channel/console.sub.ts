// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import { channel, IStandardEvent, trueFilter } from "diagnostic-channel";
import { console as consolePub } from "diagnostic-channel-publishers";

import { LogHandler } from "../logHandler";
import { KnownSeverityLevel } from "../../declarations/generated";
import { StatsbeatInstrumentation } from "../../metrics/statsbeat/types";

let handlers: LogHandler[] = [];

const subscriber = (event: IStandardEvent<consolePub.IConsoleData>) => {
    let message = event.data.message as Error | string;
    handlers.forEach((handler) => {
        if (message instanceof Error) {
            handler.trackException({ exception: message });
        } else {
            // Message can have a trailing newline
            if (message.lastIndexOf("\n") == message.length - 1) {
                message = message.substring(0, message.length - 1);
            }
            handler.trackTrace({
                message: message,
                severity: event.data.stderr
                    ? KnownSeverityLevel.Warning
                    : KnownSeverityLevel.Information,
            });
        }
    });
};

export function enable(enabled: boolean, handler: LogHandler) {
    if (enabled) {
        let handlerFound = handlers.find((c) => c == handler);
        if (handlerFound) {
            return;
        }
        if (handlers.length === 0) {
            channel.subscribe<consolePub.IConsoleData>(
                "console",
                subscriber,
                trueFilter,
                (module, version) => {
                    if (handler.statsbeat) {
                        handler.statsbeat.addInstrumentation(StatsbeatInstrumentation.CONSOLE);
                    }
                }
            );
        }
        handlers.push(handler);
    } else {
        handlers = handlers.filter((c) => c != handler);
        if (handlers.length === 0) {
            channel.unsubscribe("console", subscriber);
        }
    }
}

export function dispose() {
    channel.unsubscribe("console", subscriber);
    handlers = [];
}
