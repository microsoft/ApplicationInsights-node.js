import * as Contracts from "../../Declarations/Contracts";
import { Context } from "../../Library/Context";

/**
 *  A telemetry processor that handles Azure specific variables.
 */
export function azureRoleEnvironmentTelemetryProcessor(envelope: Contracts.EnvelopeTelemetry, context: Context): void {
    if (process.env.WEBSITE_SITE_NAME) { // Azure Web apps and Functions
        envelope.tags[context.keys.cloudRole] = process.env.WEBSITE_SITE_NAME;
    }
    if (process.env.WEBSITE_INSTANCE_ID) {
        envelope.tags[context.keys.cloudRoleInstance] = process.env.WEBSITE_INSTANCE_ID;
    }
}
