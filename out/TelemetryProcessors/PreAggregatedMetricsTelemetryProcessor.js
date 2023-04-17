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
exports.preAggregatedMetricsTelemetryProcessor = void 0;
var Contracts = require("../Declarations/Contracts");
var AutoCollecPreAggregatedMetrics = require("../AutoCollection/PreAggregatedMetrics");
var TelemetryType = require("../Declarations/Contracts");
function preAggregatedMetricsTelemetryProcessor(envelope, context) {
    if (AutoCollecPreAggregatedMetrics.isEnabled()) {
        // Increment rate counters
        switch (envelope.data.baseType) {
            case TelemetryType.TelemetryTypeString.Exception:
                var exceptionData = envelope.data.baseData;
                exceptionData.properties = __assign(__assign({}, exceptionData.properties), { "_MS.ProcessedByMetricExtractors": "(Name:'Exceptions', Ver:'1.1')" });
                var exceptionDimensions = {
                    cloudRoleInstance: envelope.tags[context.keys.cloudRoleInstance],
                    cloudRoleName: envelope.tags[context.keys.cloudRole]
                };
                AutoCollecPreAggregatedMetrics.countException(exceptionDimensions);
                break;
            case TelemetryType.TelemetryTypeString.Trace:
                var traceData = envelope.data.baseData;
                traceData.properties = __assign(__assign({}, traceData.properties), { "_MS.ProcessedByMetricExtractors": "(Name:'Traces', Ver:'1.1')" });
                var traceDimensions = {
                    cloudRoleInstance: envelope.tags[context.keys.cloudRoleInstance],
                    cloudRoleName: envelope.tags[context.keys.cloudRole],
                    traceSeverityLevel: Contracts.SeverityLevel[traceData.severity]
                };
                AutoCollecPreAggregatedMetrics.countTrace(traceDimensions);
                break;
            case TelemetryType.TelemetryTypeString.Request:
                var requestData = envelope.data.baseData;
                requestData.properties = __assign(__assign({}, requestData.properties), { "_MS.ProcessedByMetricExtractors": "(Name:'Requests', Ver:'1.1')" });
                var requestDimensions = {
                    cloudRoleInstance: envelope.tags[context.keys.cloudRoleInstance],
                    cloudRoleName: envelope.tags[context.keys.cloudRole],
                    operationSynthetic: envelope.tags[context.keys.operationSyntheticSource],
                    requestSuccess: requestData.success,
                    requestResultCode: requestData.responseCode
                };
                AutoCollecPreAggregatedMetrics.countRequest(requestData.duration, requestDimensions);
                break;
            case TelemetryType.TelemetryTypeString.Dependency:
                var remoteDependencyData = envelope.data.baseData;
                remoteDependencyData.properties = __assign(__assign({}, remoteDependencyData.properties), { "_MS.ProcessedByMetricExtractors": "(Name:'Dependencies', Ver:'1.1')" });
                var dependencyDimensions = {
                    cloudRoleInstance: envelope.tags[context.keys.cloudRoleInstance],
                    cloudRoleName: envelope.tags[context.keys.cloudRole],
                    operationSynthetic: envelope.tags[context.keys.operationSyntheticSource],
                    dependencySuccess: remoteDependencyData.success,
                    dependencyType: remoteDependencyData.type,
                    dependencyTarget: remoteDependencyData.target,
                    dependencyResultCode: remoteDependencyData.resultCode
                };
                AutoCollecPreAggregatedMetrics.countDependency(remoteDependencyData.duration, dependencyDimensions);
                break;
        }
    }
    return true;
}
exports.preAggregatedMetricsTelemetryProcessor = preAggregatedMetricsTelemetryProcessor;
//# sourceMappingURL=PreAggregatedMetricsTelemetryProcessor.js.map