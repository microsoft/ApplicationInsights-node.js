// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import TelemetryClient = require("../../Library/TelemetryClient");
import { channel, IStandardEvent } from "diagnostic-channel";

import Traceparent = require("../../Library/Traceparent");
import * as Contracts from "../../Declarations/Contracts";
import { Span, AsyncScopeManager, SpanKind } from "../AsyncHooksScopeManager";

let clients: TelemetryClient[] = [];

export const subscriber = (event: IStandardEvent<Span>) => {
    const span = event.data;
    const spanContext = span.context();
    const duration = Math.round(span._duration[0] * 1e3 + span._duration[1] / 1e6);
    const id = `|${span.context().traceId}.${span.context().spanId}.`;

    const traceparent = new Traceparent();
    traceparent.traceId = spanContext.traceId;
    traceparent.spanId = spanContext.spanId;
    traceparent.traceFlag = spanContext.traceFlags.toString();
    traceparent.parentId = span.parentSpanId ? `|${spanContext.traceId}.${span.parentSpanId}.` : null;

    const properties = {
        ...span.attributes,
    };
    if (span.status.message) {
        properties["status.message"] = span.status.message;
    }
    AsyncScopeManager.with(span, () => {
        clients.forEach((client) => {
            if (span.kind === SpanKind.SERVER || span.kind === SpanKind.CONSUMER) {
                // Server or Consumer
                client.trackRequest({
                    id: id,
                    name: span.name,
                    duration: duration,
                    resultCode: span.status.code,
                    success: span.status.code === 0,
                    url: span.attributes.component,
                    properties: properties,
                } as Contracts.RequestTelemetry & Contracts.Identified);
            } else {
                // Client or Producer or Internal
                client.trackDependency({
                    id: id,
                    name: span.name,
                    duration: duration,
                    data: span.attributes.component || span.name,
                    dependencyTypeName: span.attributes.component || span.name,
                    resultCode: span.status.code,
                    success: span.status.code === 0,
                    properties: properties
                } as Contracts.DependencyTelemetry & Contracts.Identified);
            }
        });
    });
};

export function enable(enabled: boolean, client: TelemetryClient) {
    if (enabled) {
        if (clients.length === 0) {
            channel.subscribe<any>("azure-coretracing", subscriber);
        };
        clients.push(client);
    } else {
        clients = clients.filter((c) => c != client);
        if (clients.length === 0) {
            channel.unsubscribe("azure-coretracing", subscriber);
        }
    }
}
