"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseEventHubSpan = void 0;
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
var api_1 = require("@opentelemetry/api");
var core_1 = require("@opentelemetry/core");
var semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
var Constants_1 = require("../../../Declarations/Constants");
/**
 * Average span.links[].attributes.enqueuedTime
 */
var getTimeSinceEnqueued = function (span) {
    var countEnqueueDiffs = 0;
    var sumEnqueueDiffs = 0;
    var startTimeMs = core_1.hrTimeToMilliseconds(span.startTime);
    span.links.forEach(function (_a) {
        var attributes = _a.attributes;
        var enqueuedTime = attributes === null || attributes === void 0 ? void 0 : attributes[Constants_1.ENQUEUED_TIME];
        if (enqueuedTime) {
            countEnqueueDiffs += 1;
            sumEnqueueDiffs += startTimeMs - (parseFloat(enqueuedTime.toString()) || 0);
        }
    });
    return Math.max(sumEnqueueDiffs / (countEnqueueDiffs || 1), 0);
};
/**
 * Implementation of Mapping to Azure Monitor
 *
 * https://gist.github.com/lmolkova/e4215c0f44a49ef824983382762e6b92#file-z_azure_monitor_exporter_mapping-md
 */
var parseEventHubSpan = function (span, telemetry) {
    var _a;
    var namespace = span.attributes[Constants_1.AzNamespace];
    var peerAddress = (span.attributes[semantic_conventions_1.SemanticAttributes.NET_PEER_NAME] ||
        span.attributes["peer.address"] ||
        "unknown").replace(/\/$/g, ""); // remove trailing "/"
    var messageBusDestination = (span.attributes[Constants_1.MessageBusDestination] || "unknown");
    switch (span.kind) {
        case api_1.SpanKind.CLIENT:
            telemetry.dependencyTypeName = namespace;
            telemetry.target = peerAddress + "/" + messageBusDestination;
            break;
        case api_1.SpanKind.PRODUCER:
            telemetry.dependencyTypeName = Constants_1.DependencyTypeName.QueueMessage + " | " + namespace;
            telemetry.target = peerAddress + "/" + messageBusDestination;
            break;
        case api_1.SpanKind.CONSUMER:
            telemetry.source = peerAddress + "/" + messageBusDestination;
            telemetry.measurements = __assign(__assign({}, telemetry.measurements), (_a = {}, _a[Constants_1.TIME_SINCE_ENQUEUED] = getTimeSinceEnqueued(span), _a));
            break;
        default: // no op
    }
};
exports.parseEventHubSpan = parseEventHubSpan;
//# sourceMappingURL=EventHub.js.map