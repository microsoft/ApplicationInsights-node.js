// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import { SpanKind, SpanStatusCode, Link } from "@opentelemetry/api";
import { SemanticAttributes, DbSystemValues } from "@opentelemetry/semantic-conventions";
import { ReadableSpan } from "@opentelemetry/tracing";

import * as Contracts from "../../Declarations/Contracts";
import * as Constants from "../../Declarations/Constants";
import { parseEventHubSpan } from "./Azure/EventHub";
import { DependencyTelemetry } from "../../Declarations/Contracts";

function createPropertiesFromSpan(span: ReadableSpan): { [key: string]: any; } {
    const properties: { [key: string]: any; } = {};
    for (const key of Object.keys(span.attributes)) {
        if (
            !(
                key.startsWith("http.") ||
                key.startsWith("rpc.") ||
                key.startsWith("db.") ||
                key.startsWith("peer.") ||
                key.startsWith("net.")
            )
        ) {
            properties[key] = span.attributes[key] as string;
        }
    }
    const links: Array<{ operation_Id: string, id: string }> = span.links.map((link: Link) => ({
        operation_Id: link.context.traceId,
        id: link.context.spanId
    }));
    if (links.length > 0) {
        properties["_MS.links"] = JSON.stringify(links);
    }
    return properties;
}

function isSqlDB(dbSystem: string) {
    return (
        dbSystem === DbSystemValues.DB2 ||
        dbSystem === DbSystemValues.DERBY ||
        dbSystem === DbSystemValues.MARIADB ||
        dbSystem === DbSystemValues.MSSQL ||
        dbSystem === DbSystemValues.ORACLE ||
        dbSystem === DbSystemValues.SQLITE ||
        dbSystem === DbSystemValues.OTHER_SQL ||
        dbSystem === DbSystemValues.HSQLDB ||
        dbSystem === DbSystemValues.H2
    );
}

function getUrl(span: ReadableSpan): string {
    const httpMethod = span.attributes[SemanticAttributes.HTTP_METHOD];
    if (httpMethod) {
        const httpUrl = span.attributes[SemanticAttributes.HTTP_URL];
        if (httpUrl) {
            return String(httpUrl);
        } else {
            const httpScheme = span.attributes[SemanticAttributes.HTTP_SCHEME];
            const httpTarget = span.attributes[SemanticAttributes.HTTP_TARGET];
            if (httpScheme && httpTarget) {
                const httpHost = span.attributes[SemanticAttributes.HTTP_HOST];
                if (httpHost) {
                    return `${httpScheme}://${httpHost}${httpTarget}`;
                } else {
                    const netPeerPort = span.attributes[SemanticAttributes.NET_PEER_PORT];
                    if (netPeerPort) {
                        const netPeerName = span.attributes[SemanticAttributes.NET_PEER_NAME];
                        if (netPeerName) {
                            return `${httpScheme}://${netPeerName}:${netPeerPort}${httpTarget}`;
                        } else {
                            const netPeerIp = span.attributes[SemanticAttributes.NET_PEER_IP];
                            if (netPeerIp) {
                                return `${httpScheme}://${netPeerIp}:${netPeerPort}${httpTarget}`;
                            }
                        }
                    }
                }
            }
        }
    }
    return "";
}

function getDependencyTarget(span: ReadableSpan): string {
    const peerService = span.attributes[SemanticAttributes.PEER_SERVICE];
    const httpHost = span.attributes[SemanticAttributes.HTTP_HOST];
    const httpUrl = span.attributes[SemanticAttributes.HTTP_URL];
    const netPeerName = span.attributes[SemanticAttributes.NET_PEER_NAME];
    const netPeerIp = span.attributes[SemanticAttributes.NET_PEER_IP];
    if (peerService) {
        return String(peerService);
    } else if (httpHost) {
        return String(httpHost);
    } else if (httpUrl) {
        return String(httpUrl);
    } else if (netPeerName) {
        return String(netPeerName);
    } else if (netPeerIp) {
        return String(netPeerIp);
    }
    return "";
}

function createDependencyData(span: ReadableSpan): Contracts.DependencyTelemetry {
    const remoteDependency: Contracts.DependencyTelemetry = {
        name: span.name,
        success: span.status.code != SpanStatusCode.ERROR,
        resultCode: "0",
        duration: 0,
        data: "",
        dependencyTypeName: ""
    };
    if (span.kind === SpanKind.PRODUCER) {
        remoteDependency.dependencyTypeName = Constants.DependencyTypeName.QueueMessage;
    }
    if (span.kind === SpanKind.INTERNAL && span.parentSpanId) {
        remoteDependency.dependencyTypeName = Constants.DependencyTypeName.InProc;
    }

    const httpMethod = span.attributes[SemanticAttributes.HTTP_METHOD];
    const dbSystem = span.attributes[SemanticAttributes.DB_SYSTEM];
    const rpcSystem = span.attributes[SemanticAttributes.RPC_SYSTEM];
    // HTTP Dependency
    if (httpMethod) {
        remoteDependency.dependencyTypeName = Constants.DependencyTypeName.Http;
        const httpUrl = span.attributes[SemanticAttributes.HTTP_URL];
        if (httpUrl) {
            try {
                let dependencyUrl = new URL(String(httpUrl));
                remoteDependency.name = `${httpMethod} ${dependencyUrl.pathname}`;
            }
            catch (ex) { }
        }
        remoteDependency.data = getUrl(span);
        const httpStatusCode = span.attributes[SemanticAttributes.HTTP_STATUS_CODE];
        if (httpStatusCode) {
            remoteDependency.resultCode = String(httpStatusCode);
        }
        let target = getDependencyTarget(span);
        if (target) {
            try {
                // Remove default port
                let portRegex = new RegExp(/(https?)(:\/\/.*)(:\d+)(\S*)/);
                let res = portRegex.exec(target);
                if (res != null) {
                    let protocol = res[1];
                    let port = res[3];
                    if ((protocol == "https" && port == ":443") || (protocol == "http" && port == ":80")) {
                        // Drop port
                        target = res[1] + res[2] + res[4];
                    }
                }
            } catch (error) { }
            remoteDependency.target = `${target}`;
        }
    }
    // DB Dependency
    else if (dbSystem) {
        // TODO: Remove special logic when Azure UX supports OpenTelemetry dbSystem
        if (String(dbSystem) === DbSystemValues.MYSQL) {
            remoteDependency.dependencyTypeName = "mysql";
        } else if (String(dbSystem) === DbSystemValues.POSTGRESQL) {
            remoteDependency.dependencyTypeName = "postgresql";
        } else if (String(dbSystem) === DbSystemValues.MONGODB) {
            remoteDependency.dependencyTypeName = "mongodb";
        } else if (String(dbSystem) === DbSystemValues.REDIS) {
            remoteDependency.dependencyTypeName = "redis";
        } else if (isSqlDB(String(dbSystem))) {
            remoteDependency.dependencyTypeName = "SQL";
        } else {
            remoteDependency.dependencyTypeName = String(dbSystem);
        }
        const dbStatement = span.attributes[SemanticAttributes.DB_STATEMENT];
        const dbOperation = span.attributes[SemanticAttributes.DB_OPERATION];
        if (dbStatement) {
            remoteDependency.data = String(dbStatement);
        }
        else if (dbOperation) {
            remoteDependency.data = String(dbOperation);
        }
        let target = getDependencyTarget(span);
        const dbName = span.attributes[SemanticAttributes.DB_NAME];
        if (target) {
            remoteDependency.target = dbName ? `${target}|${dbName}` : `${target}`;
        } else {
            remoteDependency.target = dbName ? `${dbName}` : `${dbSystem}`;
        }
    }
    // grpc Dependency
    else if (rpcSystem) {
        remoteDependency.dependencyTypeName = Constants.DependencyTypeName.Grpc;
        const grpcStatusCode = span.attributes[SemanticAttributes.RPC_GRPC_STATUS_CODE];
        if (grpcStatusCode) {
            remoteDependency.resultCode = String(grpcStatusCode);
        }
        let target = getDependencyTarget(span);
        if (target) {
            remoteDependency.target = `${target}`;
        } else if (rpcSystem) {
            remoteDependency.target = String(rpcSystem);
        }
    }
    return remoteDependency;
}

function createRequestData(span: ReadableSpan): Contracts.RequestTelemetry {
    const requestData: Contracts.RequestTelemetry = {
        name: span.name,
        success: span.status.code != SpanStatusCode.ERROR,
        resultCode: "0",
        duration: 0,
        url: "",
        source: undefined
    };
    const httpMethod = span.attributes[SemanticAttributes.HTTP_METHOD];
    const grpcStatusCode = span.attributes[SemanticAttributes.RPC_GRPC_STATUS_CODE];
    if (httpMethod) {
        // Try to get request name for server spans
        if (span.kind == SpanKind.SERVER) {
            const httpRoute = span.attributes[SemanticAttributes.HTTP_ROUTE];
            const httpUrl = span.attributes[SemanticAttributes.HTTP_URL];
            if (httpRoute) {
                requestData.name = `${httpMethod as string} ${httpRoute as string}`;
            }
            else if (httpUrl) {
                try {
                    let url = new URL(String(httpUrl));
                    requestData.name = `${httpMethod} ${url.pathname}`;
                }
                catch (ex) { }
            }
        }
        requestData.url = getUrl(span);
        const httpStatusCode = span.attributes[SemanticAttributes.HTTP_STATUS_CODE];
        if (httpStatusCode) {
            requestData.resultCode = String(httpStatusCode);
        }
    } else if (grpcStatusCode) {
        requestData.resultCode = String(grpcStatusCode);
    }
    return requestData;
}

export function spanToTelemetryContract(span: ReadableSpan): (Contracts.DependencyTelemetry | Contracts.RequestTelemetry) & Contracts.Identified {
    let telemetry: (Contracts.DependencyTelemetry | Contracts.RequestTelemetry) & Contracts.Identified;
    switch (span.kind) {
        case SpanKind.CLIENT:
        case SpanKind.PRODUCER:
        case SpanKind.INTERNAL:
            telemetry = createDependencyData(span);
            break;
        case SpanKind.SERVER:
        case SpanKind.CONSUMER:
            telemetry = createRequestData(span);
            break;
    }

    const spanContext = span.spanContext ? span.spanContext() : (<any>span).context(); // context is available in OT API <v0.19.0
    const id = `${spanContext.spanId}`;
    const duration = Math.round(span.duration[0] * 1e3 + span.duration[1] / 1e6);
    telemetry.id = id;
    telemetry.duration = duration;
    telemetry.properties = createPropertiesFromSpan(span);

    // Azure SDK
    if (span.attributes[Constants.AzNamespace]) {
        if (span.kind === SpanKind.INTERNAL) {
            (<DependencyTelemetry>telemetry).dependencyTypeName = `${Constants.DependencyTypeName.InProc} | ${span.attributes[Constants.AzNamespace]}`
        }
        if (span.attributes[Constants.AzNamespace] === Constants.MicrosoftEventHub) {
            parseEventHubSpan(span, telemetry);
        }
    }
    return telemetry;
}
