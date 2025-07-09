// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LogRecordProcessor } from '@opentelemetry/sdk-logs';
import { Context } from '@opentelemetry/api';

/**
 * ExtensibleLogRecordProcessor allows adding log record processors dynamically
 * after the LoggerProvider has been initialized. This is a workaround for the
 * limitation in OpenTelemetry 2.x where processors should not be added after
 * registration with the API.
 * 
 * Note: This is applied at your own risk as it's not the intended pattern
 * by OpenTelemetry authors.
 */
export class ExtensibleLogRecordProcessor implements LogRecordProcessor {
  private processors: LogRecordProcessor[];

  constructor(processors: LogRecordProcessor[] = []) {
    this.processors = [...processors];
  }

  addLogRecordProcessor(processor: LogRecordProcessor): void {
    this.processors.push(processor);
  }

  removeLogRecordProcessor(processor: LogRecordProcessor): boolean {
    const index = this.processors.indexOf(processor);
    if (index > -1) {
      this.processors.splice(index, 1);
      return true;
    }
    return false;
  }

  getProcessors(): readonly LogRecordProcessor[] {
    return [...this.processors];
  }

  async forceFlush(): Promise<void> {
    const promises = this.processors.map(processor => processor.forceFlush());
    await Promise.all(promises);
  }

  onEmit(logRecord: any, context?: Context): void {
    for (const processor of this.processors) {
      processor.onEmit(logRecord, context);
    }
  }

  async shutdown(): Promise<void> {
    const promises = this.processors.map(processor => processor.shutdown());
    await Promise.all(promises);
  }
}
