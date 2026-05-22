// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { PerfTest } from "@azure-tools/test-perf";
import appInsights from "applicationinsights";
import dotenv from "dotenv";
dotenv.config();

let started = false;
function ensureStarted(): void {
  if (started) {
    return;
  }
  appInsights
    .setup(
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ||
        "InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=https://localhost/",
    )
    .start();
  started = true;
}

export abstract class ShimTest<TOptions> extends PerfTest<TOptions> {
  constructor() {
    super();
    ensureStarted();
  }
}
