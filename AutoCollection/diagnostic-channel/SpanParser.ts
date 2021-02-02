// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import { Attributes, Span, SpanKind } from "../AsyncHooksScopeManager";
import * as Contracts from "../../Declarations/Contracts";
import * as Constants from "../../Declarations/Constants";

function filterSpanAttributes(attributes: Attributes) {
    const newAttributes = { ...attributes };
    Object.keys(Constants.SpanAttribute).forEach(key => {
        delete newAttributes[key];
    });
    return newAttributes
}

export function spanToTelemetryContract(span: Span): (Contracts.DependencyTelemetry & Contracts.RequestTelemetry) & Contracts.Identified {
    const id = `|${span.context().traceId}.${span.context().spanId}.`;
    const duration = Math.round(span._duration[0] * 1e3 + span._duration[1] / 1e6);
    const isHttp: boolean = ((span.attributes.component || "").toString().toUpperCase() === Constants.DependencyTypeName.Http) || (!!span.attributes[Constants.SpanAttribute.HttpUrl]);
    const isGrpc: boolean = (span.attributes.component || "").toString().toLowerCase() === Constants.DependencyTypeName.Grpc;
    if (isHttp) {
        // Read http span attributes
        const method = span.attributes[Constants.SpanAttribute.HttpMethod] || "GET";
        const url = new URL(span.attributes[Constants.SpanAttribute.HttpUrl].toString());
        const host = span.attributes[Constants.SpanAttribute.HttpHost] || url.host;
        const port = span.attributes[Constants.SpanAttribute.HttpPort] || url.port || null;
        const pathname = url.pathname || "/";

        // Translate to AI Dependency format
        const name = `${method} ${pathname}`;
        const dependencyTypeName = Constants.DependencyTypeName.Http;
        const target = port ? `${host}:${port}`.toString() : host.toString();
        const data = url.toString();
        const resultCode = span.attributes[Constants.SpanAttribute.HttpStatusCode] || span.status.code || 0;
        const success = resultCode < 400; // Status.OK
        return {
            id, name, dependencyTypeName,
            target, data,
            success, duration,
            url: data,
            resultCode: String(resultCode),
            properties: filterSpanAttributes(span.attributes)
        };
    } else if (isGrpc) {
        const method = span.attributes[Constants.SpanAttribute.GrpcMethod] || "rpc";
        const service = span.attributes[Constants.SpanAttribute.GrpcService];
        const name = service ? `${method} ${service}` : span.name;
        return {
            id, duration, name,
            target: service.toString(),
            data: service.toString() || name,
            url: service.toString() || name,
            dependencyTypeName: Constants.DependencyTypeName.Grpc,
            resultCode: String(span.status.code || 0),
            success: span.status.code === 0,
            properties: filterSpanAttributes(span.attributes),
        }
    } else {
        const name = span.name;
        const links = span.links && span.links.map(link => {
            return {
                operation_Id: link.context.traceId,
                id: link.context.spanId
            };
        });
        return {
            id, duration, name,
            target: span.attributes["peer.address"].toString(),
            data: span.attributes["peer.address"].toString() || name,
            url: span.attributes["peer.address"].toString() || name,
            dependencyTypeName: span.kind === SpanKind.INTERNAL ? Constants.DependencyTypeName.InProc : (span.attributes.component.toString() || span.name),
            resultCode: String(span.status.code || 0),
            success: span.status.code === 0,
            properties: {
                ...filterSpanAttributes(span.attributes),
                "_MS.links": links || undefined
            },
        };
    }
}
