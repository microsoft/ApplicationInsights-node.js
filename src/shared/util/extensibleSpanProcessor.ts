// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SpanProcessor } from '@opentelemetry/sdk-trace-base';
import { Context } from '@opentelemetry/api';

/**
 * ExtensibleSpanProcessor allows adding span processors dynamically
 * after the TracerProvider has been initialized. This is a workaround for the
 * limitation in OpenTelemetry 2.x where processors should not be added after
 * registration with the API.
 * 
 * Note: This is applied at your own risk as it's not the intended pattern
 * by OpenTelemetry authors.
 */
export class ExtensibleSpanProcessor implements SpanProcessor {
  private processors: SpanProcessor[];

  constructor(processors: SpanProcessor[] = []) {
    this.processors = [...processors];
  }

  addSpanProcessor(processor: SpanProcessor): void {
    this.processors.push(processor);
  }

  removeSpanProcessor(processor: SpanProcessor): boolean {
    const index = this.processors.indexOf(processor);
    if (index > -1) {
      this.processors.splice(index, 1);
      return true;
    }
    return false;
  }

  getProcessors(): readonly SpanProcessor[] {
    return [...this.processors];
  }

  async forceFlush(): Promise<void> {
    const promises = this.processors.map(processor => processor.forceFlush());
    await Promise.all(promises);
  }

  onStart(span: any, parentContext: Context): void {
    for (const processor of this.processors) {
      processor.onStart(span, parentContext);
    }
  }

  onEnd(span: any): void {
    for (const processor of this.processors) {
      processor.onEnd(span);
    }
  }

  async shutdown(): Promise<void> {
    const promises = this.processors.map(processor => processor.shutdown());
    await Promise.all(promises);
  }
}
