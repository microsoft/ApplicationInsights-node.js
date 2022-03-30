import * as Contracts from "../../Declarations/Contracts";
import { KnownContextTagKeys, TelemetryItem as Envelope } from "../../Declarations/Generated";
import { Context } from "../../Library/Context";

/**
 *  A telemetry processor that handles Azure specific variables.
 */
export function azureRoleEnvironmentTelemetryProcessor(envelope: Envelope, context: Context): void {
    if (process.env.WEBSITE_SITE_NAME) { // Azure Web apps and Functions
        envelope.tags[KnownContextTagKeys.AiCloudRole] = process.env.WEBSITE_SITE_NAME;
    }
    if (process.env.WEBSITE_INSTANCE_ID) {
        envelope.tags[KnownContextTagKeys.AiCloudRoleInstance] = process.env.WEBSITE_INSTANCE_ID;
    }
}
