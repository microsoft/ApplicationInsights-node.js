// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { ExportResultCode, type ExportResult } from "@opentelemetry/core";
import type { LogRecordExporter, ReadableLogRecord } from "@opentelemetry/sdk-logs";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";

export class DiscardingExporter implements SpanExporter, LogRecordExporter {
  export(
    _items: ReadableSpan[] | ReadableLogRecord[],
    resultCallback: (result: ExportResult) => void,
  ): void {
    // Retain neither telemetry nor timer callbacks across benchmark samples.
    resultCallback({ code: ExportResultCode.SUCCESS });
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
