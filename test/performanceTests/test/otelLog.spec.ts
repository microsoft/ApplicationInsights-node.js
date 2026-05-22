// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// Reference scenario: log emission via plain upstream OpenTelemetry only.
// Reported as informational baseline; not used for PR-gating regression checks.

import { PerfOptionDictionary, PerfTest } from "@azure-tools/test-perf";
import { logs, Logger } from "@opentelemetry/api-logs";
import {
  LoggerProvider,
  SimpleLogRecordProcessor,
  InMemoryLogRecordExporter,
} from "@opentelemetry/sdk-logs";

type OtelLogOptions = Record<string, unknown>;

let initialized = false;
let logger: Logger | undefined;
function ensureProvider(): Logger {
  if (initialized && logger) {
    return logger;
  }
  const provider = new LoggerProvider({
    processors: [new SimpleLogRecordProcessor(new InMemoryLogRecordExporter())],
  });
  logger = provider.getLogger("perf-otel-log");
  initialized = true;
  return logger;
}

export class OtelLogTest extends PerfTest<OtelLogOptions> {
  public options: PerfOptionDictionary<OtelLogOptions> = {};

  constructor() {
    super();
    ensureProvider();
  }

  async run(): Promise<void> {
    const l = logger ?? logs.getLogger("perf-otel-log");
    l.emit({ body: "trace message" });
  }
}
