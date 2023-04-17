import { ConnectionString } from "../Declarations/Contracts";
declare class ConnectionStringParser {
    private static _FIELDS_SEPARATOR;
    private static _FIELD_KEY_VALUE_SEPARATOR;
    static parse(connectionString?: string): ConnectionString;
    static isIkeyValid(iKey: string): boolean;
}
export = ConnectionStringParser;
