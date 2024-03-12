// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

import { Logger, LogRecord, logs, SeverityNumber } from "@opentelemetry/api-logs";
import { channel, IStandardEvent, trueFilter } from "diagnostic-channel";
import { winston } from "diagnostic-channel-publishers";
import { InstrumentationConfig } from "@opentelemetry/instrumentation";
import { Attributes } from "@opentelemetry/api";
import { attributeSerialization } from "../../shared/util/logUtil";

let logger: Logger;
let logSendingLevel: SeverityNumber;

const winstonToAILevelMap: { [key: string]: (og: string) => number } = {
    syslog(og: string) {
        const map: { [key: string]: number } = {
            emerg: SeverityNumber.FATAL3,
            alert: SeverityNumber.FATAL2,
            crit: SeverityNumber.FATAL,
            error: SeverityNumber.ERROR,
            warning: SeverityNumber.WARN,
            notice: SeverityNumber.INFO2,
            info: SeverityNumber.INFO,
            debug: SeverityNumber.DEBUG,
        };

        return map[og] === undefined ? SeverityNumber.INFO : map[og];
    },
    npm(og: string) {
        const map: { [key: string]: number } = {
            error: SeverityNumber.ERROR,
            warn: SeverityNumber.WARN,
            info: SeverityNumber.INFO,
            http: SeverityNumber.DEBUG3,
            verbose: SeverityNumber.DEBUG2,
            debug: SeverityNumber.DEBUG,
            silly: SeverityNumber.TRACE,
        };

        return map[og] === undefined ? SeverityNumber.INFO : map[og];
    },
    unknown(og: string) {
        return SeverityNumber.INFO;
    },
};

const subscriber = (event: IStandardEvent<winston.IWinstonData>) => {  
    const severity = winstonToAILevelMap[event.data.levelKind](event.data.level);
    if (logSendingLevel <= severity) {
        const attributes: Attributes = attributeSerialization(event.data.meta);
        const message = event.data.message.toString();
        const logRecord: LogRecord = {
            body: message,
            severityNumber: severity,
            attributes: attributes
        };
        logger.emit(logRecord);
    }
};

export function enable(config?: InstrumentationConfig & { logSendingLevel?: SeverityNumber }) {
    if (config?.enabled) {
        logger = logs.getLogger("ApplicationInsightsConsoleLogger");
        logSendingLevel = config.logSendingLevel || SeverityNumber.UNSPECIFIED;
        channel.subscribe<winston.IWinstonData>("winston", subscriber, trueFilter);
    }
}

export function dispose() {
    channel.unsubscribe("winston", subscriber);
}
