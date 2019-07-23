import { IConnectionStringFields } from "../Declarations/Contracts";

class ConnectionStringParser {
    private static _FIELDS_SEPARATOR = ";";
    private static _FIELD_KEY_VALUE_SEPARATOR = "=";

    public static parse(connectionString?: string): IConnectionStringFields {
        if (!connectionString) {
            return {};
        }

        const kvPairs = connectionString.split(ConnectionStringParser._FIELDS_SEPARATOR);

        return kvPairs.reduce((fields: IConnectionStringFields, kv: string) => {
            const equalsIndex = kv.indexOf(ConnectionStringParser._FIELD_KEY_VALUE_SEPARATOR);

            if (equalsIndex !== -1) { // only save fields with valid formats
                const key = kv.slice(0, equalsIndex).toLowerCase();
                const value = kv.slice(equalsIndex + 1, kv.length);
                fields[key] = value;
            }
            return fields;
        }, {});
    }
}

export = ConnectionStringParser;
