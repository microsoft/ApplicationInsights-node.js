// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// Scenario: log emission via this package's modern `useAzureMonitor` API
// plus the OpenTelemetry logs API. Gated for regression.
//
// We acquire `@opentelemetry/api-logs` via `createRequire` resolved from the
// installed `applicationinsights` package, so the Logger we benchmark is
// backed by the SAME api-logs instance that `useAzureMonitor()` registered
// its LoggerProvider on. Without this, if npm installs a duplicate copy of
// `@opentelemetry/api-logs` at the harness level, `logs.getLogger()` returns
// a no-op proxy and the benchmark silently measures nothing.

import { createRequire } from "node:module";
import { PerfOptionDictionary, PerfTest } from "@azure-tools/test-perf";
import { useAzureMonitor } from "applicationinsights";
import dotenv from "dotenv";
dotenv.config();

type AzureMonitorLogOptions = Record<string, unknown>;

const harnessRequire = createRequire(import.meta.url);
const aiEntry = harnessRequire.resolve("applicationinsights");
const aiRequire = createRequire(aiEntry);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { logs } = aiRequire("@opentelemetry/api-logs") as any;

let initialized = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let logger: any;
function ensureInit(): void {
  if (initialized) return;
  useAzureMonitor({
    azureMonitorExporterOptions: {
      connectionString:
        process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ||
        "InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=https://localhost/",
    },
  });
  logger = logs.getLogger("perf-azure-monitor-log");
  initialized = true;
}

export class AzureMonitorLogTest extends PerfTest<AzureMonitorLogOptions> {
  public options: PerfOptionDictionary<AzureMonitorLogOptions> = {};

  constructor() {
    super();
    ensureInit();
  }

  async run(): Promise<void> {
    logger.emit({ body: "trace message" });
  }
}
