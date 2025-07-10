// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as http from "http";

export function ignoreOutgoingRequestHook(request: http.RequestOptions): boolean {
  if (request && request.headers) {
    const headers = request.headers as { [key: string]: string | string[] | undefined };
    if (
      (headers["User-Agent"] &&
        headers["User-Agent"]
          .toString()
          .indexOf("azsdk-js-monitor-opentelemetry-exporter") > -1) ||
      (headers["user-agent"] &&
        headers["user-agent"]
          .toString()
          .indexOf("azsdk-js-monitor-opentelemetry-exporter") > -1)
    ) {
      return true;
    }
  }
  return false;
}
