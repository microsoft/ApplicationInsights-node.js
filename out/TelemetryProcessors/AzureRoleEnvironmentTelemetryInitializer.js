"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.azureRoleEnvironmentTelemetryProcessor = void 0;
/**
 *  A telemetry processor that handles Azure specific variables.
 */
function azureRoleEnvironmentTelemetryProcessor(envelope, context) {
    if (process.env.WEBSITE_SITE_NAME) { // Azure Web apps and Functions
        envelope.tags[context.keys.cloudRole] = process.env.WEBSITE_SITE_NAME;
    }
    if (process.env.WEBSITE_INSTANCE_ID) {
        envelope.tags[context.keys.cloudRoleInstance] = process.env.WEBSITE_INSTANCE_ID;
    }
}
exports.azureRoleEnvironmentTelemetryProcessor = azureRoleEnvironmentTelemetryProcessor;
//# sourceMappingURL=AzureRoleEnvironmentTelemetryInitializer.js.map