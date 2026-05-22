// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// Scenario: span emission via this package's modern `useAzureMonitor` API
// plus the OpenTelemetry trace API. Gated for regression.
//
// We deliberately acquire `@opentelemetry/api` from inside
// `applicationinsights`'s module-resolution tree (via `createRequire`)
// so that the Tracer we benchmark is registered against the SAME api
// instance that `useAzureMonitor()` mutated. Otherwise — if npm happens
// to install a second hoisted copy of `@opentelemetry/api` at the perf
// harness level — we would measure a no-op proxy tracer.

import { createRequire } from "node:module";
import { PerfOptionDictionary, PerfTest } from "@azure-tools/test-perf";
import { useAzureMonitor } from "applicationinsights";
import dotenv from "dotenv";
dotenv.config();

type AzureMonitorSpanOptions = Record<string, unknown>;

const harnessRequire = createRequire(import.meta.url);
const aiEntry = harnessRequire.resolve("applicationinsights");
const aiRequire = createRequire(aiEntry);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { trace } = aiRequire("@opentelemetry/api") as any;

let initialized = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tracer: any;
function ensureInit(): void {
  if (initialized) return;
  useAzureMonitor({
    azureMonitorExporterOptions: {
      connectionString:
        process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ||
        "InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=https://localhost/",
    },
  });
  tracer = trace.getTracer("perf-azure-monitor-span");
  initialized = true;
}

export class AzureMonitorSpanTest extends PerfTest<AzureMonitorSpanOptions> {
  public options: PerfOptionDictionary<AzureMonitorSpanOptions> = {};

  constructor() {
    super();
    ensureInit();
  }

  async run(): Promise<void> {
    const span = tracer.startSpan("perf-span", {
      attributes: {
        "db.system": "zsql",
        "db.statement": "SELECT * FROM Customers",
        "peer.service": "http://dbname",
      },
    });
    span.end();
  }
}
