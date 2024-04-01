// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { PerfOptionDictionary } from "@azure-tools/test-perf";
import { ShimTest } from "./appInsightsShim.spec.js";
import appInsights from "applicationinsights";

type ShimTestOptions = Record<string, unknown>;

export class TrackTraceTest extends ShimTest<ShimTestOptions> {
  public options: PerfOptionDictionary<ShimTestOptions> = {};
  constructor() {
    super();
  }

  async run(): Promise<void> {
    try {
        appInsights.defaultClient.trackTrace({ message: "trace message" });
    } catch (error) {
      console.error("Error running track trace perf test:", error);
      process.exit(1);
    }
  }
}