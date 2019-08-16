import { ConnectionStringFields } from "../Declarations/Contracts";
import Constants = require("../Declarations/Constants");

class ConnectionStringParser {
    private static _FIELDS_SEPARATOR = ";";
    private static _FIELD_KEY_VALUE_SEPARATOR = "=";

    public static parse(connectionString?: string): ConnectionStringFields {
        if (!connectionString) {
            return {};
        }

        const kvPairs = connectionString.split(ConnectionStringParser._FIELDS_SEPARATOR);

        const result: ConnectionStringFields = kvPairs.reduce((fields: ConnectionStringFields, kv: string) => {
            const kvParts = kv.split(ConnectionStringParser._FIELD_KEY_VALUE_SEPARATOR);

            if (kvParts.length === 2) { // only save fields with valid formats
                const key = kvParts[0].toLowerCase();
                const value = kvParts[1];
                fields[key] = value;
            }
            return fields;
        }, {});

        if (Object.keys(result).length > 0) {
            // this is a valid connection string, so parse the results

            if (result.endpointsuffix) {
                // use endpoint suffix where overrides are not provided
                const locationPrefix = result.location ? result.location + "." : "";
                result.ingestionendpoint = result.ingestionendpoint || ("https://" + locationPrefix + "dc." + result.endpointsuffix);
                result.liveendpoint = result.liveendpoint || ("https://" + locationPrefix + "live." + result.endpointsuffix);
            }

            // apply the default endpoints
            result.ingestionendpoint = result.ingestionendpoint || Constants.DEFAULT_BREEZE_ENDPOINT;
            result.liveendpoint = result.liveendpoint || Constants.DEFAULT_LIVEMETRICS_ENDPOINT;
        }

        return result;
    }
}

export = ConnectionStringParser;
