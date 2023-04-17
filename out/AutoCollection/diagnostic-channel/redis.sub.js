"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enable = exports.subscriber = void 0;
var Constants_1 = require("../../Declarations/Constants");
var diagnostic_channel_1 = require("diagnostic-channel");
var clients = [];
var subscriber = function (event) {
    clients.forEach(function (client) {
        if (event.data.commandObj.command === "info") {
            // We don't want to report 'info', it's irrelevant
            return;
        }
        client.trackDependency({
            target: event.data.address,
            name: event.data.commandObj.command,
            data: event.data.commandObj.command,
            duration: event.data.duration,
            success: !event.data.err,
            /* TODO: transmit result code from redis */
            resultCode: event.data.err ? "1" : "0",
            time: event.data.time,
            dependencyTypeName: "redis"
        });
    });
};
exports.subscriber = subscriber;
function enable(enabled, client) {
    if (enabled) {
        var clientFound = clients.find(function (c) { return c == client; });
        if (clientFound) {
            return;
        }
        if (clients.length === 0) {
            diagnostic_channel_1.channel.subscribe("redis", exports.subscriber, diagnostic_channel_1.trueFilter, function (module, version) {
                var statsbeat = client.getStatsbeat();
                if (statsbeat) {
                    statsbeat.addInstrumentation(Constants_1.StatsbeatInstrumentation.REDIS);
                }
            });
        }
        clients.push(client);
    }
    else {
        clients = clients.filter(function (c) { return c != client; });
        if (clients.length === 0) {
            diagnostic_channel_1.channel.unsubscribe("redis", exports.subscriber);
        }
    }
}
exports.enable = enable;
//# sourceMappingURL=redis.sub.js.map