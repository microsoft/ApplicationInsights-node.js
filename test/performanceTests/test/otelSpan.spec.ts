// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// Reference scenario: span creation via plain upstream OpenTelemetry only.
// Reported as informational baseline; not used for PR-gating regression checks.

import { PerfOptionDictionary, PerfTest } from "@azure-tools/test-perf";
import { trace, Tracer } from "@opentelemetry/api";
import {
  BasicTracerProvider,
  SimpleSpanProcessor,
  InMemorySpanExporter,
} from "@opentelemetry/sdk-trace-base";

type OtelSpanOptions = Record<string, unknown>;

let initialized = false;
let tracer: Tracer | undefined;
function ensureProvider(): Tracer {
  if (initialized && tracer) {
    return tracer;
  }
  const provider = new BasicTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(new InMemorySpanExporter())],
  });
  // Avoid setting the global provider — keeps state local so multiple
  // scenarios can coexist if ever run in the same process.
  tracer = provider.getTracer("perf-otel-span");
  initialized = true;
  return tracer;
}

export class OtelSpanTest extends PerfTest<OtelSpanOptions> {
  public options: PerfOptionDictionary<OtelSpanOptions> = {};

  constructor() {
    super();
    ensureProvider();
  }

  async run(): Promise<void> {
    const t = tracer ?? trace.getTracer("perf-otel-span");
    const span = t.startSpan("perf-span", {
      attributes: {
        "db.system": "zsql",
        "db.statement": "SELECT * FROM Customers",
        "peer.service": "http://dbname",
      },
    });
    span.end();
  }
}
