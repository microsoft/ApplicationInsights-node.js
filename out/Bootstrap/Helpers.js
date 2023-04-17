"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sdkAlreadyExists = void 0;
var DataModel_1 = require("./DataModel");
function sdkAlreadyExists(_logger) {
    try {
        // appInstance should either resolve to user SDK or crash. If it resolves to attach SDK, user probably modified their NODE_PATH
        var appInstance = void 0;
        try {
            // Node 8.9+
            appInstance = require.resolve("applicationinsights", { paths: [process.cwd()] });
        }
        catch (e) {
            // Node <8.9
            appInstance = require.resolve(process.cwd() + "/node_modules/applicationinsights");
        }
        // If loaded instance is in Azure machine home path do not attach the SDK, this means customer already instrumented their app
        if (appInstance.indexOf("home") > -1) {
            var diagnosticLog = {
                message: "Application Insights SDK already exists. Module is already installed in this application; not re-attaching. Installed SDK location: " + appInstance,
                properties: {
                    "msgId": DataModel_1.DiagnosticMessageId.sdkExists
                }
            };
            _logger.logError(diagnosticLog);
            return true;
        }
        else {
            // ApplicationInsights could be loaded outside of customer application, attach in this case
            return false;
        }
    }
    catch (e) {
        // crashed while trying to resolve "applicationinsights", so SDK does not exist. Attach appinsights
        return false;
    }
}
exports.sdkAlreadyExists = sdkAlreadyExists;
//# sourceMappingURL=Helpers.js.map