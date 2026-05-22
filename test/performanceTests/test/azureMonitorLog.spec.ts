// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// Scenario: log emission via this package's modern `useAzureMonitor` API
// plus the OpenTelemetry logs API. Gated for regression.

import { PerfOptionDictionary, PerfTest } from "@azure-tools/test-perf";
import { logs, Logger } from "@opentelemetry/api-logs";
import { useAzureMonitor } from "applicationinsights";
import dotenv from "dotenv";
dotenv.config();

type AzureMonitorLogOptions = Record<string, unknown>;

let initialized = false;
let logger: Logger | undefined;
function ensureInit(): Logger {
  if (initialized && logger) {
    return logger;
  }
  useAzureMonitor({
    azureMonitorExporterOptions: {
      connectionString:
        process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ||
        "InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=https://localhost/",
    },
  });
  logger = logs.getLogger("perf-azure-monitor-log");
  initialized = true;
  return logger;
}

export class AzureMonitorLogTest extends PerfTest<AzureMonitorLogOptions> {
  public options: PerfOptionDictionary<AzureMonitorLogOptions> = {};

  constructor() {
    super();
    ensureInit();
  }

  async run(): Promise<void> {
    logger!.emit({ body: "trace message" });
  }
}
