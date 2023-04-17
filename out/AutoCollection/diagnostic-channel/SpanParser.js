"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spanToTelemetryContract = void 0;
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
var url_1 = require("url");
var api_1 = require("@opentelemetry/api");
var semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
var Constants = require("../../Declarations/Constants");
var EventHub_1 = require("./Azure/EventHub");
var Util = require("../../Library/Util");
function createPropertiesFromSpan(span) {
    var properties = {};
    for (var _i = 0, _a = Object.keys(span.attributes); _i < _a.length; _i++) {
        var key = _a[_i];
        if (!(key.startsWith("http.") ||
            key.startsWith("rpc.") ||
            key.startsWith("db.") ||
            key.startsWith("peer.") ||
            key.startsWith("net."))) {
            properties[key] = span.attributes[key];
        }
    }
    var links = span.links.map(function (link) { return ({
        operation_Id: link.context.traceId,
        id: link.context.spanId
    }); });
    if (links.length > 0) {
        properties["_MS.links"] = Util.stringify(links);
    }
    return properties;
}
function isSqlDB(dbSystem) {
    return (dbSystem === semantic_conventions_1.DbSystemValues.DB2 ||
        dbSystem === semantic_conventions_1.DbSystemValues.DERBY ||
        dbSystem === semantic_conventions_1.DbSystemValues.MARIADB ||
        dbSystem === semantic_conventions_1.DbSystemValues.MSSQL ||
        dbSystem === semantic_conventions_1.DbSystemValues.ORACLE ||
        dbSystem === semantic_conventions_1.DbSystemValues.SQLITE ||
        dbSystem === semantic_conventions_1.DbSystemValues.OTHER_SQL ||
        dbSystem === semantic_conventions_1.DbSystemValues.HSQLDB ||
        dbSystem === semantic_conventions_1.DbSystemValues.H2);
}
function getUrl(span) {
    var httpMethod = span.attributes[semantic_conventions_1.SemanticAttributes.HTTP_METHOD];
    if (httpMethod) {
        var httpUrl = span.attributes[semantic_conventions_1.SemanticAttributes.HTTP_URL];
        if (httpUrl) {
            return String(httpUrl);
        }
        else {
            var httpScheme = span.attributes[semantic_conventions_1.SemanticAttributes.HTTP_SCHEME];
            var httpTarget = span.attributes[semantic_conventions_1.SemanticAttributes.HTTP_TARGET];
            if (httpScheme && httpTarget) {
                var httpHost = span.attributes[semantic_conventions_1.SemanticAttributes.HTTP_HOST];
                if (httpHost) {
                    return httpScheme + "://" + httpHost + httpTarget;
                }
                else {
                    var netPeerPort = span.attributes[semantic_conventions_1.SemanticAttributes.NET_PEER_PORT];
                    if (netPeerPort) {
                        var netPeerName = span.attributes[semantic_conventions_1.SemanticAttributes.NET_PEER_NAME];
                        if (netPeerName) {
                            return httpScheme + "://" + netPeerName + ":" + netPeerPort + httpTarget;
                        }
                        else {
                            var netPeerIp = span.attributes[semantic_conventions_1.SemanticAttributes.NET_PEER_IP];
                            if (netPeerIp) {
                                return httpScheme + "://" + netPeerIp + ":" + netPeerPort + httpTarget;
                            }
                        }
                    }
                }
            }
        }
    }
    return "";
}
function getDependencyTarget(span) {
    var peerService = span.attributes[semantic_conventions_1.SemanticAttributes.PEER_SERVICE];
    var httpHost = span.attributes[semantic_conventions_1.SemanticAttributes.HTTP_HOST];
    var httpUrl = span.attributes[semantic_conventions_1.SemanticAttributes.HTTP_URL];
    var netPeerName = span.attributes[semantic_conventions_1.SemanticAttributes.NET_PEER_NAME];
    var netPeerIp = span.attributes[semantic_conventions_1.SemanticAttributes.NET_PEER_IP];
    if (peerService) {
        return String(peerService);
    }
    else if (httpHost) {
        return String(httpHost);
    }
    else if (httpUrl) {
        return String(httpUrl);
    }
    else if (netPeerName) {
        return String(netPeerName);
    }
    else if (netPeerIp) {
        return String(netPeerIp);
    }
    return "";
}
function createDependencyData(span) {
    var remoteDependency = {
        name: span.name,
        success: span.status.code != api_1.SpanStatusCode.ERROR,
        resultCode: "0",
        duration: 0,
        data: "",
        dependencyTypeName: ""
    };
    if (span.kind === api_1.SpanKind.PRODUCER) {
        remoteDependency.dependencyTypeName = Constants.DependencyTypeName.QueueMessage;
    }
    if (span.kind === api_1.SpanKind.INTERNAL && span.parentSpanId) {
        remoteDependency.dependencyTypeName = Constants.DependencyTypeName.InProc;
    }
    var httpMethod = span.attributes[semantic_conventions_1.SemanticAttributes.HTTP_METHOD];
    var dbSystem = span.attributes[semantic_conventions_1.SemanticAttributes.DB_SYSTEM];
    var rpcSystem = span.attributes[semantic_conventions_1.SemanticAttributes.RPC_SYSTEM];
    // HTTP Dependency
    if (httpMethod) {
        remoteDependency.dependencyTypeName = Constants.DependencyTypeName.Http;
        var httpUrl = span.attributes[semantic_conventions_1.SemanticAttributes.HTTP_URL];
        if (httpUrl) {
            var pathName = "";
            try {
                var dependencyUrl = new url_1.URL(String(httpUrl));
                pathName = dependencyUrl.pathname;
            }
            catch (ex) {
                // Ignore error
            }
            remoteDependency.name = httpMethod + " " + pathName;
        }
        remoteDependency.data = getUrl(span);
        var httpStatusCode = span.attributes[semantic_conventions_1.SemanticAttributes.HTTP_STATUS_CODE];
        if (httpStatusCode) {
            remoteDependency.resultCode = String(httpStatusCode);
        }
        var target = getDependencyTarget(span);
        if (target) {
            try {
                // Remove default port
                var portRegex = new RegExp(/(https?)(:\/\/.*)(:\d+)(\S*)/);
                var res = portRegex.exec(target);
                if (res != null) {
                    var protocol = res[1];
                    var port = res[3];
                    if ((protocol == "https" && port == ":443") || (protocol == "http" && port == ":80")) {
                        // Drop port
                        target = res[1] + res[2] + res[4];
                    }
                }
            }
            catch (error) {
                // Ignore error
            }
            remoteDependency.target = "" + target;
        }
    }
    // DB Dependency
    else if (dbSystem) {
        // TODO: Remove special logic when Azure UX supports OpenTelemetry dbSystem
        if (String(dbSystem) === semantic_conventions_1.DbSystemValues.MYSQL) {
            remoteDependency.dependencyTypeName = "mysql";
        }
        else if (String(dbSystem) === semantic_conventions_1.DbSystemValues.POSTGRESQL) {
            remoteDependency.dependencyTypeName = "postgresql";
        }
        else if (String(dbSystem) === semantic_conventions_1.DbSystemValues.MONGODB) {
            remoteDependency.dependencyTypeName = "mongodb";
        }
        else if (String(dbSystem) === semantic_conventions_1.DbSystemValues.REDIS) {
            remoteDependency.dependencyTypeName = "redis";
        }
        else if (isSqlDB(String(dbSystem))) {
            remoteDependency.dependencyTypeName = "SQL";
        }
        else {
            remoteDependency.dependencyTypeName = String(dbSystem);
        }
        var dbStatement = span.attributes[semantic_conventions_1.SemanticAttributes.DB_STATEMENT];
        var dbOperation = span.attributes[semantic_conventions_1.SemanticAttributes.DB_OPERATION];
        if (dbStatement) {
            remoteDependency.data = String(dbStatement);
        }
        else if (dbOperation) {
            remoteDependency.data = String(dbOperation);
        }
        var target = getDependencyTarget(span);
        var dbName = span.attributes[semantic_conventions_1.SemanticAttributes.DB_NAME];
        if (target) {
            remoteDependency.target = dbName ? target + "|" + dbName : "" + target;
        }
        else {
            remoteDependency.target = dbName ? "" + dbName : "" + dbSystem;
        }
    }
    // grpc Dependency
    else if (rpcSystem) {
        remoteDependency.dependencyTypeName = Constants.DependencyTypeName.Grpc;
        var grpcStatusCode = span.attributes[semantic_conventions_1.SemanticAttributes.RPC_GRPC_STATUS_CODE];
        if (grpcStatusCode) {
            remoteDependency.resultCode = String(grpcStatusCode);
        }
        var target = getDependencyTarget(span);
        if (target) {
            remoteDependency.target = "" + target;
        }
        else if (rpcSystem) {
            remoteDependency.target = String(rpcSystem);
        }
    }
    return remoteDependency;
}
function createRequestData(span) {
    var requestData = {
        name: span.name,
        success: span.status.code != api_1.SpanStatusCode.ERROR,
        resultCode: "0",
        duration: 0,
        url: "",
        source: undefined
    };
    var httpMethod = span.attributes[semantic_conventions_1.SemanticAttributes.HTTP_METHOD];
    var grpcStatusCode = span.attributes[semantic_conventions_1.SemanticAttributes.RPC_GRPC_STATUS_CODE];
    if (httpMethod) {
        // Try to get request name for server spans
        if (span.kind == api_1.SpanKind.SERVER) {
            var httpRoute = span.attributes[semantic_conventions_1.SemanticAttributes.HTTP_ROUTE];
            var httpUrl = span.attributes[semantic_conventions_1.SemanticAttributes.HTTP_URL];
            if (httpRoute) {
                requestData.name = httpMethod + " " + httpRoute;
            }
            else if (httpUrl) {
                try {
                    var url = new url_1.URL(String(httpUrl));
                    requestData.name = httpMethod + " " + url.pathname;
                }
                catch (ex) {
                    // Ignore error
                }
            }
        }
        requestData.url = getUrl(span);
        var httpStatusCode = span.attributes[semantic_conventions_1.SemanticAttributes.HTTP_STATUS_CODE];
        if (httpStatusCode) {
            requestData.resultCode = String(httpStatusCode);
        }
    }
    else if (grpcStatusCode) {
        requestData.resultCode = String(grpcStatusCode);
    }
    return requestData;
}
function spanToTelemetryContract(span) {
    var telemetry;
    switch (span.kind) {
        case api_1.SpanKind.CLIENT:
        case api_1.SpanKind.PRODUCER:
        case api_1.SpanKind.INTERNAL:
            telemetry = createDependencyData(span);
            break;
        case api_1.SpanKind.SERVER:
        case api_1.SpanKind.CONSUMER:
            telemetry = createRequestData(span);
            break;
    }
    var spanContext = span.spanContext ? span.spanContext() : span.context(); // context is available in OT API <v0.19.0
    var id = "" + spanContext.spanId;
    var duration = Math.round(span.duration[0] * 1e3 + span.duration[1] / 1e6);
    telemetry.id = id;
    telemetry.duration = duration;
    telemetry.properties = createPropertiesFromSpan(span);
    // Azure SDK
    if (span.attributes[Constants.AzNamespace]) {
        if (span.kind === api_1.SpanKind.INTERNAL) {
            telemetry.dependencyTypeName = Constants.DependencyTypeName.InProc + " | " + span.attributes[Constants.AzNamespace];
        }
        if (span.attributes[Constants.AzNamespace] === Constants.MicrosoftEventHub) {
            EventHub_1.parseEventHubSpan(span, telemetry);
        }
    }
    return telemetry;
}
exports.spanToTelemetryContract = spanToTelemetryContract;
//# sourceMappingURL=SpanParser.js.map