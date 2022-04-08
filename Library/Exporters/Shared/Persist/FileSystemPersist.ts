// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from "os";
import * as path from "path";

import { Logger } from "../../../Logging/Logger";
import { IPersistentStorage } from "../../../../Declarations/Types";
import { DEFAULT_EXPORTER_CONFIG, IAzureExporterInternalConfig } from "../../../../Declarations/Config";
import {
  confirmDirExists,
  getShallowDirectorySize,
  statAsync,
  readdirAsync,
  readFileAsync,
  unlinkAsync, writeFileAsync
} from "../../../Util/FileSystemHelper";
import { FileAccessControl } from "./FileAccessControl";


const TEMPDIR_PREFIX = "applicationinsights-";
const FILENAME_SUFFIX = ".ai.json";

/**
 * File system persist class.
 * @internal
 */
export class FileSystemPersist implements IPersistentStorage {
  public fileRetemptionPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
  public cleanupTimeOut = 60 * 60 * 1000; // 1 hour
  public maxBytesOnDisk: number = 50_000_000; // ~50MB

  private _fileAccessControl: FileAccessControl;
  private _TAG = "FileSystemPersist";
  private _enabled: boolean;
  private _tempDirectory: string;
  private _fileCleanupTimer: NodeJS.Timer | null = null;
  private readonly _options: IAzureExporterInternalConfig;

  constructor(options: Partial<IAzureExporterInternalConfig> = {}) {
    this._enabled = true;
    this._fileAccessControl = FileAccessControl.getInstance();
    this._fileAccessControl.checkFileProtection();

    if (!this._fileAccessControl.osProvidesFileProtection) {
      this._enabled = false;
      Logger.warn(this._TAG, "Sufficient file protection capabilities were not detected. Files will not be persisted");
    }
    this._options = { ...DEFAULT_EXPORTER_CONFIG, ...options };
    if (!this._options.instrumentationKey) {
      this._enabled = false;
      Logger.warn(this._TAG, "No instrumentation key was provided to FileSystemPersister. Files will not be persisted");
    }
    if (this._enabled) {
      this._tempDirectory = path.join(
        os.tmpdir(),
        TEMPDIR_PREFIX + this._options.instrumentationKey
      );
      // Starts file cleanup task
      if (!this._fileCleanupTimer) {
        this._fileCleanupTimer = setTimeout(() => {
          this._fileCleanupTask();
        }, this.cleanupTimeOut);
        this._fileCleanupTimer.unref();
      }
    }
  }

  public push(value: unknown[]): Promise<boolean> {
    if (this._enabled) {
      Logger.info(this._TAG, "Pushing value to persistent storage", value.toString());
      return this._storeToDisk(JSON.stringify(value));
    }
  }

  public async shift(): Promise<unknown> {
    if (this._enabled) {
      Logger.info(this._TAG, "Searching for filesystem persisted files");
      try {
        const buffer = await this._getFirstFileOnDisk();
        if (buffer) {
          return JSON.parse(buffer.toString("utf8"));
        }
      } catch (e) {
        Logger.info(this._TAG, "Failed to read persisted file", e);
      }
      return null;
    }
  }

  /**
   * Check for temp telemetry files
   * reads the first file if exist, deletes it and tries to send its load
   */
  private async _getFirstFileOnDisk(): Promise<Buffer | null> {
    try {
      const stats = await statAsync(this._tempDirectory);
      if (stats.isDirectory()) {
        const origFiles = await readdirAsync(this._tempDirectory);
        const files = origFiles.filter((f) =>
          path.basename(f).includes(FILENAME_SUFFIX)
        );
        if (files.length === 0) {
          return null;
        } else {
          const firstFile = files[0];
          const filePath = path.join(this._tempDirectory, firstFile);
          const payload = await readFileAsync(filePath);
          // delete the file first to prevent double sending
          await unlinkAsync(filePath);
          return payload;
        }
      }
      return null;
    } catch (e) {
      if (e.code === "ENOENT") {
        // File does not exist -- return null instead of throwing
        return null;
      } else {
        throw e;
      }
    }
  }

  private async _storeToDisk(payload: string): Promise<boolean> {
    try {
      await confirmDirExists(this._tempDirectory);
    } catch (error) {
      Logger.warn(this._TAG, `Error while checking/creating directory: `, error && error.message);
      return false;
    }

    try {
      await this._fileAccessControl.applyACLRules(this._tempDirectory);
    }
    catch (ex) {
      Logger.warn(this._TAG, "Failed to apply file access control to folder: " + (ex && ex.message));
      return false;
    }

    try {
      const size = await getShallowDirectorySize(this._tempDirectory);
      if (size > this.maxBytesOnDisk) {
        Logger.warn(this._TAG,
          `Not saving data due to max size limit being met. Directory size in bytes is: ${size}`
        );
        return false;
      }
    } catch (error) {
      Logger.warn(this._TAG, `Error while checking size of persistence directory: `, error && error.message);
      return false;
    }

    const fileName = `${new Date().getTime()}${FILENAME_SUFFIX}`;
    const fileFullPath = path.join(this._tempDirectory, fileName);

    // Mode 600 is w/r for creator and no read access for others (only applies on *nix)
    // For Windows, ACL rules are applied to the entire directory (see logic in FileAccessControl)
    Logger.info(this._TAG, `saving data to disk at: ${fileFullPath}`);
    try {
      await writeFileAsync(fileFullPath, payload, { mode: 0o600 });
    } catch (writeError) {
      Logger.warn(this._TAG, `Error writing file to persistent file storage`, writeError);
      return false;
    }
    return true;
  }

  private async _fileCleanupTask(): Promise<boolean> {
    try {
      const stats = await statAsync(this._tempDirectory);
      if (stats.isDirectory()) {
        const origFiles = await readdirAsync(this._tempDirectory);
        const files = origFiles.filter((f) =>
          path.basename(f).includes(FILENAME_SUFFIX)
        );
        if (files.length === 0) {
          return false;
        } else {
          files.forEach(async (file) => {
            // Check expiration
            const fileCreationDate: Date = new Date(
              parseInt(file.split(FILENAME_SUFFIX)[0])
            );
            const expired = new Date(+new Date() - this.fileRetemptionPeriod) > fileCreationDate;
            if (expired) {
              const filePath = path.join(this._tempDirectory, file);
              await unlinkAsync(filePath);
            }
          });
          return true;
        }
      }
      return false;
    } catch (error) {
      Logger.info(this._TAG, `Failed cleanup of persistent file storage expired files`, error);
      return false;
    }
  }
}
