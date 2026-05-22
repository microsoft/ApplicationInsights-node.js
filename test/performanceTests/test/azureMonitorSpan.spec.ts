// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// Scenario: span emission via this package's modern `useAzureMonitor` API
// plus the OpenTelemetry API. Gated for regression.

import { PerfOptionDictionary, PerfTest } from "@azure-tools/test-perf";
import { trace, Tracer } from "@opentelemetry/api";
import { useAzureMonitor } from "applicationinsights";
import dotenv from "dotenv";
dotenv.config();

type AzureMonitorSpanOptions = Record<string, unknown>;

let initialized = false;
let tracer: Tracer | undefined;
function ensureInit(): Tracer {
  if (initialized && tracer) {
    return tracer;
  }
  useAzureMonitor({
    azureMonitorExporterOptions: {
      connectionString:
        process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ||
        "InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=https://localhost/",
    },
  });
  tracer = trace.getTracer("perf-azure-monitor-span");
  initialized = true;
  return tracer;
}

export class AzureMonitorSpanTest extends PerfTest<AzureMonitorSpanOptions> {
  public options: PerfOptionDictionary<AzureMonitorSpanOptions> = {};

  constructor() {
    super();
    ensureInit();
  }

  async run(): Promise<void> {
    const t = tracer!;
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
