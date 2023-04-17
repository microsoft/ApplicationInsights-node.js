import * as DataModel from "./DataModel";
export interface FileWriterOptions {
    append: boolean;
    deleteOnExit: boolean;
    sizeLimit: number;
    renamePolicy: "rolling" | "overwrite" | "stop";
    chmod: number;
}
export declare const homedir: string;
export declare class FileWriter implements DataModel.AgentLogger {
    private _filepath;
    private _filename;
    callback: (_err: Error) => void;
    private _ready;
    private _options;
    private static _fullpathsToDelete;
    private static _listenerAttached;
    private static DEFAULT_OPTIONS;
    static isNodeVersionCompatible(): boolean;
    constructor(_filepath: string, _filename: string, options?: Partial<FileWriterOptions>);
    log(message: any): void;
    error(message: any): void;
    private _appendFile;
    private _writeFile;
    private static _addCloseHandler;
    private _shouldRenameFile;
}
