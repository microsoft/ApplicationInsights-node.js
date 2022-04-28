"use strict";

import * as path from "path";
import * as fs from "fs";
import * as DataModel from "./dataModel";
import * as FileHelpers from "./helpers/fileHelpers";

export interface FileWriterOptions {
    append: boolean; // Overwrite or append on file write (false)
    deleteOnExit: boolean; // (true)
    sizeLimit: number; // (10 KB)
    renamePolicy: "rolling" | "overwrite" | "stop"; // What to do with file when it exceeds time/size limits
    chmod: number; // Linux only
}

export const homedir = FileHelpers.homedir;

const DEFAULT_OPTIONS: FileWriterOptions = {
    append: false,
    deleteOnExit: true,
    sizeLimit: 10 * 1024,
    renamePolicy: "stop",
    chmod: 0o644, // rw/r/r
};

export class FileWriter implements DataModel.AgentLogger {
    public callback = (_err: Error) => {}; // no-op
    private _ready = false;
    private _options: FileWriterOptions;
    private _fullpathsToDelete: string[] = [];
    private _listenerAttached = false;

    // leave at "keep at single file only", "write up to certain size limit", "clear old file on process startup"
    constructor(
        private _filepath: string,
        private _filename: string,
        options?: Partial<FileWriterOptions>
    ) {
        this._options = { ...DEFAULT_OPTIONS, ...options };
        this._ready = FileHelpers.makeStatusDirs(this._filepath);
        if (this._options.deleteOnExit) {
            this._addCloseHandler();
            this._fullpathsToDelete.push(path.join(this._filepath, this._filename));
        }
    }

    public log(message: any) {
        if (this._ready) {
            let data = typeof message === "object" ? JSON.stringify(message) : message.toString();

            // Check if existing file needs to be renamed
            this._shouldRenameFile((err, shouldRename) => {
                if (err) return;

                if (shouldRename) {
                    if (this._options.renamePolicy === "rolling") {
                        FileHelpers.renameCurrentFile(
                            this._filepath,
                            this._filename,
                            (renameErr, renamedFullpath) => {
                                if (renameErr) return;
                                this._fullpathsToDelete.push(renamedFullpath);
                                this._options.append
                                    ? this._appendFile(data + "\n")
                                    : this._writeFile(data);
                            }
                        );
                    } else if (this._options.renamePolicy === "overwrite") {
                        // Clear the current file
                        this._writeFile(data);
                    } else if (this._options.renamePolicy === "stop") {
                        // Stop future Logger
                        this._ready = false;
                    }
                } else {
                    this._options.append ? this._appendFile(data + "\n") : this._writeFile(data);
                }
            });
        }
    }

    public error(message: any) {
        this.log(message);
    }

    private _appendFile(message: string) {
        const fullpath = path.join(this._filepath, this._filename);
        fs.appendFile(fullpath, message, (err) => {
            this.callback(err);
        });
    }

    private _writeFile(message: string) {
        const fullpath = path.join(this._filepath, this._filename);
        fs.writeFile(fullpath, message, { mode: this._options.chmod }, this.callback);
    }

    private _addCloseHandler() {
        if (!this._listenerAttached) {
            process.on("exit", () => {
                this._fullpathsToDelete.forEach((filename) => {
                    try {
                        fs.unlinkSync(filename);
                    } catch (err) {
                        /** ignore errors */
                    }
                });
            });
            this._listenerAttached = true;
        }
    }

    private _shouldRenameFile(
        callback?: (err: Error | null, shouldRename?: boolean) => void
    ): void {
        const fullpath = path.join(this._filepath, this._filename);
        fs.stat(fullpath, (err, stats) => {
            if (err) {
                if (err.code === "ENOENT" && typeof callback === "function") {
                    callback(null, false);
                } else if (typeof callback === "function") {
                    callback(err);
                }
                return;
            }

            if (stats.size > this._options.sizeLimit) {
                callback(null, true);
            } else {
                const createDate = new Date(stats.birthtime);
                const currentDate = new Date();
                const result =
                    createDate.getUTCDate() !== currentDate.getUTCDate() ||
                    createDate.getUTCMonth() !== currentDate.getUTCMonth() ||
                    createDate.getUTCFullYear() !== currentDate.getUTCFullYear();
                callback(null, result);
            }
        });
    }
}
