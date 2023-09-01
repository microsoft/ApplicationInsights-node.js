// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ApplicationInsightsClient } from "./applicationInsightsClient";
import { ApplicationInsightsOptions } from "./types";

let client: ApplicationInsightsClient;

/**
 * Initialize Application Insights
 * @param options Azure Monitor OpenTelemetry Options
 */
export function useAzureMonitor(options?: ApplicationInsightsOptions) {
    client = new ApplicationInsightsClient(options);
}

/**
* Shutdown Application Insights
*/
export function shutdownAzureMonitor() {
    client.shutdown();
}
