"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispose = exports.enable = void 0;
var Contracts_1 = require("../../Declarations/Contracts");
var Constants_1 = require("../../Declarations/Constants");
var diagnostic_channel_1 = require("diagnostic-channel");
var clients = [];
var subscriber = function (event) {
    var message = event.data.message;
    clients.forEach(function (client) {
        if (message instanceof Error) {
            client.trackException({ exception: message });
        }
        else {
            // Message can have a trailing newline
            if (message.lastIndexOf("\n") == message.length - 1) {
                message = message.substring(0, message.length - 1);
            }
            client.trackTrace({ message: message, severity: (event.data.stderr ? Contracts_1.SeverityLevel.Warning : Contracts_1.SeverityLevel.Information) });
        }
    });
};
function enable(enabled, client) {
    if (enabled) {
        var clientFound = clients.find(function (c) { return c == client; });
        if (clientFound) {
            return;
        }
        if (clients.length === 0) {
            diagnostic_channel_1.channel.subscribe("console", subscriber, diagnostic_channel_1.trueFilter, function (module, version) {
                var statsbeat = client.getStatsbeat();
                if (statsbeat) {
                    statsbeat.addInstrumentation(Constants_1.StatsbeatInstrumentation.CONSOLE);
                }
            });
        }
        clients.push(client);
    }
    else {
        clients = clients.filter(function (c) { return c != client; });
        if (clients.length === 0) {
            diagnostic_channel_1.channel.unsubscribe("console", subscriber);
        }
    }
}
exports.enable = enable;
function dispose() {
    diagnostic_channel_1.channel.unsubscribe("console", subscriber);
    clients = [];
}
exports.dispose = dispose;
//# sourceMappingURL=console.sub.js.map