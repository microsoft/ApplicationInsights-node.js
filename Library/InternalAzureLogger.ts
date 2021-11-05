import fs = require("fs");
import os = require("os");
import path = require("path");
import { AzureLogger, setLogLevel, createClientLogger } from "@azure/logger";
import FileSystemHelper = require("./FileSystemHelper");


class InternalAzureLogger {

    private static _instance: InternalAzureLogger;
    public logger: AzureLogger;
    public maxHistory: number;
    public maxSizeBytes: number;

    private TAG = "Logger";
    private _tempDir: string;
    public _logFileName: string;
    private _fileBackupsCount: number;
    private _fileFullPath: string;
    private _backUpNameFormat: string;

    constructor() {
        setLogLevel("verbose"); // Verbose so we can control log level in our side
        let logDestination = process.env.APPLICATIONINSIGHTS_LOG_DESTINATION; // destination can be one of file, console or file+console
        let logToFile = false;
        let logToConsole = true;
        if (logDestination == "file+console") {
            logToFile = true;
        }
        if (logDestination == "file") {
            logToFile = true;
            logToConsole = false;
        }

        this.maxSizeBytes = 50000;
        this.maxHistory = 1;
        this._fileBackupsCount = 0;
        this._logFileName = "applicationinsights.log";

        // If custom path not provided use temp folder, /tmp for *nix and USERDIR/AppData/Local/Temp for Windows
        let logFilePath = process.env.APPLICATIONINSIGHTS_LOGDIR;
        if (!logFilePath) {
            this._tempDir = path.join(os.tmpdir(), "appInsights-node");
        }
        else {
            if (path.isAbsolute(logFilePath)) {
                this._tempDir = logFilePath;
            }
            else {
                this._tempDir = path.join(process.cwd(), logFilePath);
            }
        }
        this._fileFullPath = path.join(this._tempDir, this._logFileName);
        this._backUpNameFormat = "." + this._logFileName; // {currentime}.applicationinsights.log

        // Override AzureLogger to also enable logs to be stored in disk
        AzureLogger.log = (...args) => {
            if (logToFile) {
                this._storeToDisk(args);
            }
            if (logToConsole) {
                console.log(...args);
            }
        };

        this.logger = createClientLogger('ApplicationInsights');
        this._getCurrentLogsCount();
    }

    static getInstance() {
        if (!InternalAzureLogger._instance) {
            InternalAzureLogger._instance = new InternalAzureLogger();
        }
        return InternalAzureLogger._instance;
    }

    private _getCurrentLogsCount() {
        // Get the directory listing
        fs.readdir(this._tempDir, (readErr, files) => {
            if (!readErr) {
                files = files.filter(f => path.basename(f).indexOf(this._backUpNameFormat) > -1);
                this._fileBackupsCount = files.length;
            }
        });
    }

    private _storeToDisk(args: any, cb?: (err: NodeJS.ErrnoException) => void) {
        let data = args + "\r\n";
        let callback = cb ? cb : (err: NodeJS.ErrnoException) => {
            if (err) {
                console.log(this.TAG, "Error saving log to disk: " + (err && err.message));
            }
        };
        FileSystemHelper.confirmDirExists(this._tempDir, (error) => {
            if (error) {
                callback(error);
                return;
            }

            fs.access(this._fileFullPath, fs.constants.F_OK, (accessErr) => {
                if (accessErr) {
                    //No file create one  
                    fs.appendFile(this._fileFullPath, data, (writeError) => {
                        callback(writeError);
                    });
                }
                else {
                    FileSystemHelper.getShallowFileSize(this._fileFullPath, (sizeError, size) => {
                        if (sizeError || size < 0) {
                            callback(sizeError);
                            return;
                        }
                        // File limit reached 
                        else if (size > this.maxSizeBytes) {
                            // Backup file
                            if (this.maxHistory > 0) {

                                this._createBackupFile(data, (backupErr) => {
                                    if (backupErr) {
                                        callback(backupErr);
                                    }
                                    else {
                                        if (this._fileBackupsCount > this.maxHistory) {
                                            this._fileCleanupTask((deleteError) => {
                                                callback(deleteError);
                                            });
                                        }else{
                                            callback(null);
                                        }
                                    }
                                });
                            }
                            else {
                                // No backups overwrite file
                                fs.writeFile(this._fileFullPath, data, (writeError) => {
                                    callback(writeError);
                                });
                            }
                        }
                        // No limit reached append to file
                        else {
                            fs.appendFile(this._fileFullPath, data, (writeError) => {
                                callback(writeError);
                            });
                        }
                    });
                }
            });
        });
    }

    private _createBackupFile(data: string, callback: (err: NodeJS.ErrnoException) => void) {
        this._fileBackupsCount++;
        let backupPath = new Date().getTime() + "." + this._logFileName;
        fs.rename(this._fileFullPath, path.join(this._tempDir, backupPath), (renameError) => {
            if (renameError) {
                callback(renameError);
                return;
            }
            if (this._fileBackupsCount > this.maxHistory) {
                // Delete older file
                this._fileCleanupTask((cleanUpError) => {
                    if (cleanUpError) {
                        fs.writeFile(this._fileFullPath, data, (writeError) => {
                            if (writeError) {
                                callback(writeError);
                                return;
                            }
                            callback(null);
                        });
                    }
                });
            } else {
                fs.writeFile(this._fileFullPath, data, (writeError) => {
                    if (writeError) {
                        callback(writeError);
                        return;
                    }
                    callback(null);
                });
            }
        });
    }

    private _fileCleanupTask(callback: (err: NodeJS.ErrnoException) => void) {
        fs.exists(this._tempDir, (exists: boolean) => {
            if (exists) {
                fs.readdir(this._tempDir, (readError, files) => {
                    if (!readError) {
                        files = files.filter(f => path.basename(f).indexOf(this._backUpNameFormat) > -1);
                        if (files.length > 0) {
                            let oldestFile = "";
                            let oldestDate = new Date();

                            files.forEach(file => {
                                // Check expiration
                                let fileCreationDate: Date = new Date(parseInt(file.split(this._backUpNameFormat)[0]));
                                if (fileCreationDate < oldestDate) {
                                    oldestDate = fileCreationDate;
                                    oldestFile = file;
                                }
                            });
                            if (oldestFile) {
                                var filePath = path.join(this._tempDir, oldestFile);
                                fs.unlink(filePath, (deleteError) => {
                                    if (deleteError) {
                                        console.log(this.TAG, "Failed to delete backup log file: " + deleteError);
                                    } else {
                                        this._fileBackupsCount--;
                                    }
                                    callback(deleteError);
                                });
                            } else {
                                callback(null);
                            }

                        }
                    } else {
                        console.log(this.TAG, "Failed to read backup files folder: " + readError);
                        callback(readError);
                    }
                });
            }
        });
    }
}

export = InternalAzureLogger;