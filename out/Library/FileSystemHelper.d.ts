/// <reference types="node" />
import * as fs from "fs";
export declare const statAsync: typeof fs.stat.__promisify__;
export declare const lstatAsync: typeof fs.lstat.__promisify__;
export declare const mkdirAsync: typeof fs.mkdir.__promisify__;
export declare const accessAsync: typeof fs.access.__promisify__;
export declare const appendFileAsync: typeof fs.appendFile.__promisify__;
export declare const writeFileAsync: typeof fs.writeFile.__promisify__;
export declare const readFileAsync: typeof fs.readFile.__promisify__;
export declare const readdirAsync: typeof fs.readdir.__promisify__;
export declare const unlinkAsync: typeof fs.unlink.__promisify__;
/**
 * Validate directory exists.
 */
export declare const confirmDirExists: (directory: string) => Promise<void>;
/**
 * Computes the size (in bytes) of all files in a directory at the root level. Asynchronously.
 */
export declare const getShallowDirectorySize: (directory: string) => Promise<number>;
/**
* Computes the size (in bytes) of all files in a directory at the root level. Synchronously.
*/
export declare const getShallowDirectorySizeSync: (directory: string) => number;
/**
* Computes the size (in bytes) of a file asynchronously.
*/
export declare const getShallowFileSize: (filePath: string) => Promise<number>;
