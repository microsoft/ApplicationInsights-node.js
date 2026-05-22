// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// Reference scenario: log emission via plain upstream OpenTelemetry only.
// Reported as informational baseline; not used for PR-gating regression checks.
//
// Uses the provider directly (no global LoggerProvider registration) so this
// benchmark is unaffected by whether other scenarios in the same install share
// or duplicate the @opentelemetry/api-logs module instance.

import { PerfOptionDictionary, PerfTest } from "@azure-tools/test-perf";
import type { Logger } from "@opentelemetry/api-logs";
import {
  LoggerProvider,
  SimpleLogRecordProcessor,
  InMemoryLogRecordExporter,
} from "@opentelemetry/sdk-logs";

type OtelLogOptions = Record<string, unknown>;

let logger: Logger | undefined;
function ensureProvider(): Logger {
  if (logger) {
    return logger;
  }
  const provider = new LoggerProvider({
    processors: [new SimpleLogRecordProcessor(new InMemoryLogRecordExporter())],
  });
  logger = provider.getLogger("perf-otel-log");
  return logger;
}

export class OtelLogTest extends PerfTest<OtelLogOptions> {
  public options: PerfOptionDictionary<OtelLogOptions> = {};

  constructor() {
    super();
    ensureProvider();
  }

  async run(): Promise<void> {
    logger!.emit({ body: "trace message" });
  }
}
