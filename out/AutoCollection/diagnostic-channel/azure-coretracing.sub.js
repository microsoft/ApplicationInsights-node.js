"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enable = exports.subscriber = void 0;
var api_1 = require("@opentelemetry/api");
var Constants_1 = require("../../Declarations/Constants");
var diagnostic_channel_1 = require("diagnostic-channel");
var SpanParser = require("./SpanParser");
var AsyncHooksScopeManager_1 = require("../AsyncHooksScopeManager");
var clients = [];
var subscriber = function (event) {
    try {
        var span_1 = event.data;
        var telemetry_1 = SpanParser.spanToTelemetryContract(span_1);
        AsyncHooksScopeManager_1.AsyncScopeManager.with(span_1, function () {
            clients.forEach(function (client) {
                if (span_1.kind === api_1.SpanKind.SERVER || span_1.kind === api_1.SpanKind.CONSUMER) {
                    client.trackRequest(telemetry_1);
                }
                else if (span_1.kind === api_1.SpanKind.CLIENT || span_1.kind === api_1.SpanKind.INTERNAL || span_1.kind === api_1.SpanKind.PRODUCER) {
                    client.trackDependency(telemetry_1);
                }
            });
        });
    }
    catch (err) {
        { /** ignore errors */ }
    }
};
exports.subscriber = subscriber;
function enable(enabled, client) {
    if (enabled) {
        var clientFound = clients.find(function (c) { return c == client; });
        if (clientFound) {
            return;
        }
        if (clients.length === 0) {
            diagnostic_channel_1.channel.subscribe("azure-coretracing", exports.subscriber, diagnostic_channel_1.trueFilter, function (module, version) {
                var statsbeat = client.getStatsbeat();
                if (statsbeat) {
                    statsbeat.addInstrumentation(Constants_1.StatsbeatInstrumentation.AZURE_CORE_TRACING);
                }
            });
        }
        clients.push(client);
    }
    else {
        clients = clients.filter(function (c) { return c != client; });
        if (clients.length === 0) {
            diagnostic_channel_1.channel.unsubscribe("azure-coretracing", exports.subscriber);
        }
    }
}
exports.enable = enable;
//# sourceMappingURL=azure-coretracing.sub.js.map