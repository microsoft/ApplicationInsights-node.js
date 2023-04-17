declare class InternalAzureLogger {
    private static _instance;
    maxHistory: number;
    maxSizeBytes: number;
    private TAG;
    private _cleanupTimeOut;
    private static _fileCleanupTimer;
    private _tempDir;
    _logFileName: string;
    private _fileFullPath;
    private _backUpNameFormat;
    private _logToFile;
    private _logToConsole;
    constructor();
    info(message?: any, ...optionalParams: any[]): void;
    warning(message?: any, ...optionalParams: any[]): void;
    static getInstance(): InternalAzureLogger;
    private _storeToDisk;
    private _createBackupFile;
    private _fileCleanupTask;
}
export = InternalAzureLogger;
