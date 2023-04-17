import Contracts = require("../Declarations/Contracts");
import Context = require("../Library/Context");
/**
 *  A telemetry processor that handles Azure specific variables.
 */
export declare function azureRoleEnvironmentTelemetryProcessor(envelope: Contracts.EnvelopeTelemetry, context: Context): void;
