"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enable = exports.subscriber = void 0;
var Constants_1 = require("../../Declarations/Constants");
var diagnostic_channel_1 = require("diagnostic-channel");
var clients = [];
var subscriber = function (event) {
    if (event.data.event.commandName === "ismaster") {
        // suppress noisy ismaster commands
        return;
    }
    clients.forEach(function (client) {
        var dbName = (event.data.startedData && event.data.startedData.databaseName) || "Unknown database";
        client.trackDependency({
            target: dbName,
            data: event.data.event.commandName,
            name: event.data.event.commandName,
            duration: event.data.event.duration,
            success: event.data.succeeded,
            /* TODO: transmit result code from mongo */
            resultCode: event.data.succeeded ? "0" : "1",
            time: event.data.startedData.time,
            dependencyTypeName: "mongodb"
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
            diagnostic_channel_1.channel.subscribe("mongodb", exports.subscriber, diagnostic_channel_1.trueFilter, function (module, version) {
                var statsbeat = client.getStatsbeat();
                if (statsbeat) {
                    statsbeat.addInstrumentation(Constants_1.StatsbeatInstrumentation.MONGODB);
                }
            });
        }
        clients.push(client);
    }
    else {
        clients = clients.filter(function (c) { return c != client; });
        if (clients.length === 0) {
            diagnostic_channel_1.channel.unsubscribe("mongodb", exports.subscriber);
        }
    }
}
exports.enable = enable;
//# sourceMappingURL=mongodb.sub.js.map