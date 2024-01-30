import * as fs from "fs";
import path = require("path");
import { promisify } from "util";
import Logging = require("./Logging");

export const statAsync = promisify(fs.stat);
export const lstatAsync = promisify(fs.lstat);
export const mkdirAsync = promisify(fs.mkdir);
export const accessAsync = promisify(fs.access);
export const appendFileAsync = promisify(fs.appendFile);
export const writeFileAsync = promisify(fs.writeFile);
export const readFileAsync = promisify(fs.readFile);
export const readdirAsync = promisify(fs.readdir);
export const unlinkAsync = promisify(fs.unlink);

/**
 * Validate directory exists.
 */
export const confirmDirExists = async (directory: string): Promise<void> => {
    try {
        const stats = await lstatAsync(directory);
        if (!stats.isDirectory()) {
            throw new Error("Path existed but was not a directory");
        }
    } catch (err) {
        if (err && err.code === "ENOENT") {
            try {
                await mkdirAsync(directory);
            } catch (mkdirErr) {
                if (mkdirErr && mkdirErr.code !== "EEXIST") {
                    // Handle race condition by ignoring EEXIST
                    throw mkdirErr;
                }
            }
        }
    }
};

/**
 * Computes the size (in bytes) of all files in a directory at the root level. Asynchronously.
 */
export const getShallowDirectorySize = async (directory: string): Promise<number> => {
    let totalSize = 0;
    try {
        // Get the directory listing
        const files = await readdirAsync(directory);
        // Query all file sizes
        for (const file of files) {
            const fileStats = await statAsync(path.join(directory, file));
            if (fileStats.isFile()) {
                totalSize += fileStats.size;
            }
        }
        return totalSize;
    } catch {
        Logging.warn(`Failed to get directory size for ${directory}`);
        return totalSize;
    }
};

/**
* Computes the size (in bytes) of all files in a directory at the root level. Synchronously.
*/
export const getShallowDirectorySizeSync = (directory: string): number => {
    let totalSize = 0;
    try {
        let files = fs.readdirSync(directory);
        for (let i = 0; i < files.length; i++) {
            totalSize += fs.statSync(path.join(directory, files[i])).size;
        }
        return totalSize;
    } catch {
        Logging.warn(`Failed to get directory size synchronously for ${directory}`)
        return totalSize;
    }
}

/**
* Computes the size (in bytes) of a file asynchronously.
*/
export const getShallowFileSize = async (filePath: string): Promise<number> => {
    try {
        const fileStats = await statAsync(filePath);
        if (fileStats.isFile()) {
            return fileStats.size;
        }
    } catch {
        Logging.warn(`Failed to get file size for ${filePath}`);
    }
}

