import * as DataModel from "./DataModel";
export declare class DiagnosticLogger {
    private _writer;
    static readonly DEFAULT_FILE_NAME: string;
    static readonly DEFAULT_LOG_DIR: string;
    private _defaultProperties;
    constructor(_writer?: DataModel.AgentLogger, instrumentationKey?: string);
    logMessage(diagnosticLog: DataModel.DiagnosticLog): void;
    logError(diagnosticLog: DataModel.DiagnosticLog): void;
}
