import * as fs from "fs";
import path = require("path");

/**
 * Validate directory exists.
 */
export const confirmDirExists = (directory: string, callback: (err: NodeJS.ErrnoException) => void) => {
    fs.lstat(directory, (err, stats) => {
        if (err && err.code === 'ENOENT') {
            fs.mkdir(directory, (createDirErr) => {
                if (createDirErr && createDirErr.code !== 'EEXIST') { // Handle race condition by ignoring EEXIST
                    callback(createDirErr);

                }
            });
        } else if (!err && !stats.isDirectory()) {
            callback(err || new Error("Path existed but was not a directory"));
        }
        callback(null);
    });
}

/**
     * Computes the size (in bytes) of all files in a directory at the root level. Asynchronously.
     */
export const getShallowDirectorySize = (directory: string, callback: (err: NodeJS.ErrnoException, size: number) => void) => {
    // Get the directory listing
    fs.readdir(directory, (err, files) => {
        if (err) {
            return callback(err, -1);
        }

        let error: NodeJS.ErrnoException = null;
        let totalSize = 0;
        let count = 0;

        if (files.length === 0) {
            callback(null, 0);
            return;
        }

        // Query all file sizes
        for (let i = 0; i < files.length; i++) {
            fs.stat(path.join(directory, files[i]), (err, fileStats) => {
                count++;

                if (err) {
                    error = err;
                } else {
                    if (fileStats.isFile()) {
                        totalSize += fileStats.size;
                    }
                }

                if (count === files.length) {
                    // Did we get an error?
                    if (error) {
                        callback(error, -1);
                    } else {
                        callback(error, totalSize);
                    }
                }
            });
        }
    });
}

/**
* Computes the size (in bytes) of a file asynchronously.
*/
export const getShallowFileSize = (file: string, callback: (err: NodeJS.ErrnoException, size: number) => void) => {
    // Get the file stats
    fs.stat(file, (err, fileStats) => {
        let totalSize = 0;
        if (err) {
            return callback(err, -1);
        } else {
            if (fileStats.isFile()) {
                totalSize += fileStats.size;
            }
        }
        callback(null, totalSize);
    });
}

/**
* Computes the size (in bytes) of all files in a directory at the root level. Synchronously.
*/
export const getShallowDirectorySizeSync = (directory: string): number => {
    let files = fs.readdirSync(directory);
    let totalSize = 0;
    for (let i = 0; i < files.length; i++) {
        totalSize += fs.statSync(path.join(directory, files[i])).size;
    }
    return totalSize;
}
