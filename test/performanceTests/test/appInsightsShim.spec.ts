// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { PerfTest } from "@azure-tools/test-perf";
import appInsights from "applicationinsights";
import dotenv from "dotenv";
dotenv.config();

export abstract class ShimTest<TOptions> extends PerfTest<TOptions> {
  constructor() {
    super();
    appInsights
      .setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || "<your-connection-string>")
      .start();
  }
}
