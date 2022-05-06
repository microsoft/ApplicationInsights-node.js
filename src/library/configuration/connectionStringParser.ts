// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Logger } from "../logging";
import { ConnectionString, ConnectionStringKey } from "../../declarations/contracts";
import * as Constants from "../../declarations/constants";

/**
 * ConnectionString parser.
 * @internal
 */
export class ConnectionStringParser {
    private readonly FIELDS_SEPARATOR = ";";
    private readonly FIELD_KEY_VALUE_SEPARATOR = "=";

    public parse(connectionString?: string): ConnectionString {
        if (!connectionString) {
            return {};
        }

        const kvPairs = connectionString.split(this.FIELDS_SEPARATOR);
        let isValid = true;

        const result: ConnectionString = kvPairs.reduce((fields: ConnectionString, kv: string) => {
            const kvParts = kv.split(this.FIELD_KEY_VALUE_SEPARATOR);

            if (kvParts.length === 2) {
                // only save fields with valid formats
                const key = kvParts[0].toLowerCase() as ConnectionStringKey;
                const value = kvParts[1];
                return { ...fields, [key]: value };
            }
            Logger.getInstance().error(
                `Connection string key-value pair is invalid: ${kv}`,
                `Entire connection string will be discarded`,
                connectionString
            );
            isValid = false;
            return fields;
        }, {});

        if (isValid && Object.keys(result).length > 0) {
            // this is a valid connection string, so parse the results

            if (result.endpointsuffix) {
                // use endpoint suffix where overrides are not provided
                const locationPrefix = result.location ? `${result.location}.` : "";
                result.ingestionendpoint =
                    result.ingestionendpoint ||
                    `https://${locationPrefix}dc.${result.endpointsuffix}`;
                result.liveendpoint =
                    result.liveendpoint || `https://${locationPrefix}live.${result.endpointsuffix}`;
            }

            result.ingestionendpoint = result.ingestionendpoint
                ? this._sanitizeUrl(result.ingestionendpoint)
                : Constants.DEFAULT_BREEZE_ENDPOINT;
            result.liveendpoint = result.liveendpoint
                ? this._sanitizeUrl(result.liveendpoint)
                : Constants.DEFAULT_LIVEMETRICS_ENDPOINT;
            if (result.authorization && result.authorization.toLowerCase() !== "ikey") {
                Logger.getInstance().warn(
                    `Connection String contains an unsupported 'Authorization' value: ${result.authorization!}. Defaulting to 'Authorization=ikey'. Instrumentation Key ${result.instrumentationkey!}`
                );
            }
        } else {
            Logger.getInstance().error(
                "An invalid connection string was passed in. There may be telemetry loss",
                connectionString
            );
        }

        return result;
    }

    private _sanitizeUrl(url: string) {
        let newUrl = url.trim();
        if (newUrl.indexOf("https://") < 0) {
            // Try to update http to https
            newUrl = newUrl.replace("http://", "https://");
        }
        // Remove final slash if present
        if (newUrl[newUrl.length - 1] == "/") {
            newUrl = newUrl.slice(0, -1);
        }
        return newUrl;
    }
}
