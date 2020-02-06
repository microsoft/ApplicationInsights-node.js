import appInsights = require('applicationinsights');
import HttpRequestParser  = require("applicationinsights/out/AutoCollection/HttpRequestParser");
import { CorrelationContextManager } from "applicationinsights/out/AutoCollection/CorrelationContextManager";

// Setup app insights first
appInsights.setup('InstrumentationKey=25498541-2456-471a-bd73-c915ad18e7ef')
  .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
  .start();

import axios from "axios";
import { AzureFunction, Context, HttpRequest } from "@azure/functions"

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const start = Date.now();

    // Parse HTTP headers for correlation propagation
    const parser = new HttpRequestParser(req as any);
    const requestContext = CorrelationContextManager.generateContextObject(
        parser.getOperationId({}),
        parser.getOperationParentId({}),
        parser.getOperationName({}),
        parser.getCorrelationContextHeader(),
        parser.getTraceparent(),
        parser.getTracestate()
    );
    context.log(requestContext.operation.id, requestContext.operation.parentId, parser.getRequestId());


    await CorrelationContextManager.runWithContext(requestContext, async () => {
        const dependencyContext = CorrelationContextManager.generateContextObject(
            parser.getOperationId({}),
            parser.getRequestId(),
            parser.getOperationName({}),
            parser.getCorrelationContextHeader()
        );
        let response = { status: 500, statusText: "unknown" };

        // Make a dependency call -- telemetry is automatically sent and correlated
        await CorrelationContextManager.runWithContext(dependencyContext, async () => {
            response = await axios.get("https://httpbin.org/status/201");
        });

        // Send request telemetry, flush immediately
        appInsights.defaultClient.trackRequest({
            name: context.req.method + " " + context.req.url,
            resultCode: response.status,
            success: response.status >= 200 && response.status < 400,
            url: req.url,
            duration: Date.now() - start,
            id: parser.getTraceparent().spanId
        } as appInsights.Contracts.RequestTelemetry & { id: string });
        appInsights.defaultClient.flush();

        // Send function response
        context.res = {
            status: response.status,
            body: response.statusText
        };
    });
};

export default httpTrigger;
