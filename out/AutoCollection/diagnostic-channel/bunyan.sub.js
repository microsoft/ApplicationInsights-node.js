"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispose = exports.enable = void 0;
var Contracts_1 = require("../../Declarations/Contracts");
var Constants_1 = require("../../Declarations/Constants");
var diagnostic_channel_1 = require("diagnostic-channel");
var clients = [];
// Mapping from bunyan levels defined at https://github.com/trentm/node-bunyan/blob/master/lib/bunyan.js#L256
var bunyanToAILevelMap = {
    10: Contracts_1.SeverityLevel.Verbose,
    20: Contracts_1.SeverityLevel.Verbose,
    30: Contracts_1.SeverityLevel.Information,
    40: Contracts_1.SeverityLevel.Warning,
    50: Contracts_1.SeverityLevel.Error,
    60: Contracts_1.SeverityLevel.Critical
};
var subscriber = function (event) {
    var message = event.data.result;
    clients.forEach(function (client) {
        try {
            // Try to parse message as Bunyan log is JSON
            var log = JSON.parse(message);
            if (log.err) {
                var bunyanError = new Error(log.err.message);
                bunyanError.name = log.err.name;
                bunyanError.stack = log.err.stack;
                client.trackException({ exception: bunyanError });
                // return;  For now, let's also log a trace message to avoid losing other properties of 'message'
            }
        }
        catch (err) {
            // Ignore error
        }
        var AIlevel = bunyanToAILevelMap[event.data.level];
        client.trackTrace({ message: message, severity: AIlevel });
    });
};
function enable(enabled, client) {
    if (enabled) {
        var clientFound = clients.find(function (c) { return c == client; });
        if (clientFound) {
            return;
        }
        if (clients.length === 0) {
            diagnostic_channel_1.channel.subscribe("bunyan", subscriber, diagnostic_channel_1.trueFilter, function (module, version) {
                var statsbeat = client.getStatsbeat();
                if (statsbeat) {
                    statsbeat.addInstrumentation(Constants_1.StatsbeatInstrumentation.BUNYAN);
                }
            });
        }
        clients.push(client);
    }
    else {
        clients = clients.filter(function (c) { return c != client; });
        if (clients.length === 0) {
            diagnostic_channel_1.channel.unsubscribe("bunyan", subscriber);
        }
    }
}
exports.enable = enable;
function dispose() {
    diagnostic_channel_1.channel.unsubscribe("bunyan", subscriber);
    clients = [];
}
exports.dispose = dispose;
//# sourceMappingURL=bunyan.sub.js.map