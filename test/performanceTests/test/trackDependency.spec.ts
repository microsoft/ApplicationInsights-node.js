// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { PerfOptionDictionary } from "@azure-tools/test-perf";
import { ShimTest } from "./appInsightsShim.spec.js";
import appInsights from "applicationinsights";

type ShimTestOptions = Record<string, unknown>;

export class TrackDependencyTest extends ShimTest<ShimTestOptions> {
  public options: PerfOptionDictionary<ShimTestOptions> = {};
  constructor() {
    super();
  }

  async run(): Promise<void> {
    try {
        appInsights.defaultClient.trackDependency({
            target:"http://dbname",
            name:"select customers proc",
            data:"SELECT * FROM Customers",
            duration:231,
            resultCode:0,
            success: true,
            dependencyTypeName: "ZSQL"
        });
    } catch (error) {
      console.error("Error running track dependency perf test:", error);
      process.exit(1);
    }
  }
}