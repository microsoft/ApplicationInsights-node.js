// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// Reference scenario: span creation via plain upstream OpenTelemetry only.
// Reported as informational baseline; not used for PR-gating regression checks.
//
// Uses the provider directly (no global TracerProvider registration) so this
// benchmark is unaffected by whether other scenarios in the same install share
// or duplicate the @opentelemetry/api module instance.

import { PerfOptionDictionary, PerfTest } from "@azure-tools/test-perf";
import type { Tracer } from "@opentelemetry/api";
import {
  BasicTracerProvider,
  SimpleSpanProcessor,
  InMemorySpanExporter,
} from "@opentelemetry/sdk-trace-base";

type OtelSpanOptions = Record<string, unknown>;

let tracer: Tracer | undefined;
function ensureProvider(): Tracer {
  if (tracer) {
    return tracer;
  }
  const provider = new BasicTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(new InMemorySpanExporter())],
  });
  tracer = provider.getTracer("perf-otel-span");
  return tracer;
}

export class OtelSpanTest extends PerfTest<OtelSpanOptions> {
  public options: PerfOptionDictionary<OtelSpanOptions> = {};

  constructor() {
    super();
    ensureProvider();
  }

  async run(): Promise<void> {
    const span = tracer!.startSpan("perf-span", {
      attributes: {
        "db.system": "zsql",
        "db.statement": "SELECT * FROM Customers",
        "peer.service": "http://dbname",
      },
    });
    span.end();
  }
}
