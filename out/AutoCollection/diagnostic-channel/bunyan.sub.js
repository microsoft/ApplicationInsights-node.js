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
        // For now, we will simply log everything as a trace.
        //   The older 1.8.x code would actually never log an
        //   exception anyway since message was NEVER of type
        //   Error(shown here):
        //
        // var subscriber = function (event) {
        //     var message = event.data.result;
        //     clients.forEach(function (client) {
        //         var AIlevel = bunyanToAILevelMap[event.data.level];
        //         if (message instanceof Error) {
        //             client.trackException({ exception: (message) });
        //         }
        //         else {
        //             client.trackTrace({ message: message, severity: AIlevel });
        //         }
        //     });
        // };
        // The way this code is written effectively breaks the Bunyan interface.
        //   For now, bypass writing any exceptions.
        //   For example, additional error detail is lost if you supplied a custom message.
        //   https://github.com/trentm/node-bunyan#log-method-api
        /*
        try {
            // Try to parse message as Bunyan log is JSON
            let log: any = JSON.parse(message);
            if (log.err) {
                let bunyanError = new Error(log.err.message);
                bunyanError.name = log.err.name;
                bunyanError.stack = log.err.stack;
                client.trackException({ exception: bunyanError });
                return;
            }
        }
        catch (err) {
            // Ignore error
        }
        */
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