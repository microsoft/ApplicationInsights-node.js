import Contracts = require("../Declarations/Contracts");
import Context = require("../Library/Context");

/**
 *  @deprecated The method should not be called, Azure Properties will be added always when available
 *  A telemetry processor that handles Azure specific variables.
 */
export function azureRoleEnvironmentTelemetryProcessor(envelope: Contracts.EnvelopeTelemetry, context: Context): void {
    // NO-OP
}
