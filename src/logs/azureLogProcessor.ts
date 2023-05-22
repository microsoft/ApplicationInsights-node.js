// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { MetricHandler } from "../metrics/metricHandler";
import { LogRecord, LogRecordProcessor } from "@opentelemetry/sdk-logs";


export class AzureLogProcessor implements LogRecordProcessor {
    constructor(private readonly _metricHandler: MetricHandler) { }

    public onEmit(logRecord: LogRecord): void {
         // Record standard metrics
         this._metricHandler.recordLog(logRecord);
    }

    public forceFlush(): Promise<void> {
        return Promise.resolve();
    }

    public shutdown(): Promise<void> {
        return Promise.resolve();
    }

}
