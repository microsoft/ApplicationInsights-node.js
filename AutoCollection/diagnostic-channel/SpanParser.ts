// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import { Span, SpanKind } from "../AsyncHooksScopeManager";
import * as Contracts from "../../Declarations/Contracts";
import * as Constants from "../../Declarations/Constants";

export function spanToTelemetryContract(span: Span): (Contracts.DependencyTelemetry & Contracts.RequestTelemetry) & Contracts.Identified {
    const id = `${span.context().traceId}.${span.context().spanId}`;
    const duration = Math.round(span._duration[0] * 1e3 + span._duration[1] / 1e6);
    const isHttp: boolean = (span.attributes.component || "").toUpperCase() === Constants.DependencyTypeName.Http;
    const isGrpc: boolean = (span.attributes.component || "").toLowerCase() === Constants.DependencyTypeName.Http;
    if (isHttp) {
        // Read http span attributes
        const method = span.attributes[Constants.SpanAttribute.HttpMethod] || "GET";
        const url = new URL(span.attributes[Constants.SpanAttribute.HttpUrl]);
        const host = span.attributes[Constants.SpanAttribute.HttpHost] || url.host;
        const port = span.attributes[Constants.SpanAttribute.HttpPort] || url.port || null;
        const pathname = url.pathname || "/";

        // Translate to AI Dependency format
        const name = `${method} ${pathname}`;
        const dependencyTypeName = Constants.DependencyTypeName.Http;
        const target = port ? `${host}:${port}` : host;
        const data = url.toString();
        const resultCode = span.status.code;
        const success = span.status.code === 0; // Status.OK
        return {
            id, name, dependencyTypeName,
            target, data, resultCode,
            success, duration,
            url: data,
            properties: span.attributes
        };
    } else if (isGrpc) {
        const method = span.attributes[Constants.SpanAttribute.GrpcMethod] || "rpc";
        const service = span.attributes[Constants.SpanAttribute.GrpcService];
        const name = service ? `${method} ${service}` : span.name;
        return {
            id, duration, name,
            data: service || name,
            url: service || name,
            dependencyTypeName: Constants.DependencyTypeName.Grpc,
            resultCode: span.status.code,
            success: span.status.code === 0,
            properties: span.attributes
        }
    } else {
        const name = span.name;
        return {
            id, duration, name,
            data: name,
            url: name,
            dependencyTypeName: span.kind === SpanKind.INTERNAL ? Constants.DependencyTypeName.InProc : (span.attributes.component || span.name),
            resultCode: span.status.code,
            success: span.status.code === 0,
            properties: span.attributes,
        };
    }
}
