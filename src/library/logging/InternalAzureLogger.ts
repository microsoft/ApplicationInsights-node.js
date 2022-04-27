import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  accessAsync,
  appendFileAsync,
  confirmDirExists,
  getShallowFileSize,
  readdirAsync,
  readFileAsync,
  writeFileAsync,
  unlinkAsync,
} from "../util";

export class InternalAzureLogger {
  public maxHistory: number;
  public maxSizeBytes: number;

  private static _instance: InternalAzureLogger;
  private _TAG = "Logger";
  private _cleanupTimeOut = 60 * 30 * 1000; // 30 minutes;
  private _fileCleanupTimer: NodeJS.Timer = null;
  private _tempDir: string;
  public _logFileName: string;
  private _fileFullPath: string;
  private _backUpNameFormat: string;
  private _logToFile = false;
  private _logToConsole = true;

  constructor() {
    let logDestination = process.env.APPLICATIONINSIGHTS_LOG_DESTINATION; // destination can be one of file, console or file+console
    if (logDestination == "file+console") {
      this._logToFile = true;
    }
    if (logDestination == "file") {
      this._logToFile = true;
      this._logToConsole = false;
    }
    this.maxSizeBytes = 50000;
    this.maxHistory = 1;
    this._logFileName = "applicationinsights.log";

    // If custom path not provided use temp folder, /tmp for *nix and USERDIR/AppData/Local/Temp for Windows
    let logFilePath = process.env.APPLICATIONINSIGHTS_LOGDIR;
    if (!logFilePath) {
      this._tempDir = path.join(os.tmpdir(), "appInsights-node");
    } else {
      if (path.isAbsolute(logFilePath)) {
        this._tempDir = logFilePath;
      } else {
        this._tempDir = path.join(process.cwd(), logFilePath);
      }
    }
    this._fileFullPath = path.join(this._tempDir, this._logFileName);
    this._backUpNameFormat = "." + this._logFileName; // {currentime}.applicationinsights.log

    if (this._logToFile) {
      if (!this._fileCleanupTimer) {
        this._fileCleanupTimer = setInterval(() => {
          this._fileCleanupTask();
        }, this._cleanupTimeOut);
        this._fileCleanupTimer.unref();
      }
    }
  }

  public static getInstance() {
    if (!InternalAzureLogger._instance) {
      InternalAzureLogger._instance = new InternalAzureLogger();
    }
    return InternalAzureLogger._instance;
  }

  public info(message?: any, ...optionalParams: any[]) {
    let args = message ? [message, ...optionalParams] : optionalParams;
    if (this._logToFile) {
      this._storeToDisk(args);
    }
    if (this._logToConsole) {
      console.info(...args);
    }
  }

  public warning(message?: any, ...optionalParams: any[]) {
    let args = message ? [message, ...optionalParams] : optionalParams;
    if (this._logToFile) {
      this._storeToDisk(args);
    }
    if (this._logToConsole) {
      console.warn(...args);
    }
  }

  private async _storeToDisk(args: any): Promise<void> {
    let data = args + "\r\n";

    try {
      await confirmDirExists(this._tempDir);
    } catch (err) {
      console.log(this._TAG, "Failed to create directory for log file: " + (err && err.message));
      return;
    }
    try {
      await accessAsync(this._fileFullPath, fs.constants.F_OK);
    } catch (err) {
      // No file create one
      await appendFileAsync(this._fileFullPath, data).catch((appendError) => {
        console.log(
          this._TAG,
          "Failed to put log into file: " + (appendError && appendError.message)
        );
      });
      return;
    }
    try {
      // Check size
      let size = await getShallowFileSize(this._fileFullPath);
      if (size > this.maxSizeBytes) {
        await this._createBackupFile(data);
      } else {
        await appendFileAsync(this._fileFullPath, data);
      }
    } catch (err) {
      console.log(this._TAG, "Failed to create backup file: " + (err && err.message));
    }
  }

  private async _createBackupFile(data: string): Promise<void> {
    try {
      let buffer = await readFileAsync(this._fileFullPath);
      let backupPath = path.join(this._tempDir, new Date().getTime() + "." + this._logFileName);
      await writeFileAsync(backupPath, buffer);
    } catch (err) {
      console.log("Failed to generate backup log file", err);
    } finally {
      // Store logs
      writeFileAsync(this._fileFullPath, data);
    }
  }

  private async _fileCleanupTask(): Promise<void> {
    try {
      let files = await readdirAsync(this._tempDir);
      // Filter only backup files
      files = files.filter((f) => path.basename(f).indexOf(this._backUpNameFormat) > -1);
      // Sort by creation date
      files.sort((a: string, b: String) => {
        // Check expiration
        let aCreationDate: Date = new Date(parseInt(a.split(this._backUpNameFormat)[0]));
        let bCreationDate: Date = new Date(parseInt(b.split(this._backUpNameFormat)[0]));
        if (aCreationDate < bCreationDate) {
          return -1;
        }
        if (aCreationDate >= bCreationDate) {
          return 1;
        }
      });
      let totalFiles = files.length;
      for (let i = 0; i < totalFiles - this.maxHistory; i++) {
        let pathToDelete = path.join(this._tempDir, files[i]);
        await unlinkAsync(pathToDelete);
      }
    } catch (err) {
      console.log(this._TAG, "Failed to cleanup log files: " + (err && err.message));
    }
  }
}
