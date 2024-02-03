// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

import { Logger, LogRecord, logs } from "@opentelemetry/api-logs";

import { channel, IStandardEvent, trueFilter } from "diagnostic-channel";
import { console as consolePub } from "diagnostic-channel-publishers";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { InstrumentationConfig } from "@opentelemetry/instrumentation";


let logger: Logger;
let logSendingLevel: SeverityNumber;

const subscriber = (event: IStandardEvent<consolePub.IConsoleData>) => {
    let severity = (event.data.message as string | Error) instanceof Error ? SeverityNumber.ERROR : (event.data.stderr
        ? SeverityNumber.WARN
        : SeverityNumber.INFO);
    if (logSendingLevel <= severity) {
        let message = event.data.message.toString();
        // Message can have a trailing newline
        if (message.lastIndexOf("\n") === message.length - 1) {
            message = message.substring(0, message.length - 1);
        }
        let logRecord: LogRecord = {
            body: message,
            severityNumber: severity
        };
        logger.emit(logRecord);
    }
};

export function enable(config?: InstrumentationConfig & { logSendingLevel?: SeverityNumber }) {
    if (config?.enabled) {
        logger = logs.getLogger("ApplicationInsightsConsoleLogger");
        logSendingLevel = config.logSendingLevel || SeverityNumber.UNSPECIFIED;
        channel.subscribe<consolePub.IConsoleData>("console", subscriber, trueFilter);
    }
}

export function dispose() {
    channel.unsubscribe("console", subscriber);
}
