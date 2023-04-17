"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShallowFileSize = exports.getShallowDirectorySizeSync = exports.getShallowDirectorySize = exports.confirmDirExists = exports.unlinkAsync = exports.readdirAsync = exports.readFileAsync = exports.writeFileAsync = exports.appendFileAsync = exports.accessAsync = exports.mkdirAsync = exports.lstatAsync = exports.statAsync = void 0;
var fs = require("fs");
var path = require("path");
var util_1 = require("util");
exports.statAsync = util_1.promisify(fs.stat);
exports.lstatAsync = util_1.promisify(fs.lstat);
exports.mkdirAsync = util_1.promisify(fs.mkdir);
exports.accessAsync = util_1.promisify(fs.access);
exports.appendFileAsync = util_1.promisify(fs.appendFile);
exports.writeFileAsync = util_1.promisify(fs.writeFile);
exports.readFileAsync = util_1.promisify(fs.readFile);
exports.readdirAsync = util_1.promisify(fs.readdir);
exports.unlinkAsync = util_1.promisify(fs.unlink);
/**
 * Validate directory exists.
 */
var confirmDirExists = function (directory) { return __awaiter(void 0, void 0, void 0, function () {
    var stats, err_1, mkdirErr_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 7]);
                return [4 /*yield*/, exports.lstatAsync(directory)];
            case 1:
                stats = _a.sent();
                if (!stats.isDirectory()) {
                    throw new Error("Path existed but was not a directory");
                }
                return [3 /*break*/, 7];
            case 2:
                err_1 = _a.sent();
                if (!(err_1 && err_1.code === "ENOENT")) return [3 /*break*/, 6];
                _a.label = 3;
            case 3:
                _a.trys.push([3, 5, , 6]);
                return [4 /*yield*/, exports.mkdirAsync(directory)];
            case 4:
                _a.sent();
                return [3 /*break*/, 6];
            case 5:
                mkdirErr_1 = _a.sent();
                if (mkdirErr_1 && mkdirErr_1.code !== "EEXIST") {
                    // Handle race condition by ignoring EEXIST
                    throw mkdirErr_1;
                }
                return [3 /*break*/, 6];
            case 6: return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.confirmDirExists = confirmDirExists;
/**
 * Computes the size (in bytes) of all files in a directory at the root level. Asynchronously.
 */
var getShallowDirectorySize = function (directory) { return __awaiter(void 0, void 0, void 0, function () {
    var files, totalSize, _i, files_1, file, fileStats;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, exports.readdirAsync(directory)];
            case 1:
                files = _a.sent();
                totalSize = 0;
                _i = 0, files_1 = files;
                _a.label = 2;
            case 2:
                if (!(_i < files_1.length)) return [3 /*break*/, 5];
                file = files_1[_i];
                return [4 /*yield*/, exports.statAsync(path.join(directory, file))];
            case 3:
                fileStats = _a.sent();
                if (fileStats.isFile()) {
                    totalSize += fileStats.size;
                }
                _a.label = 4;
            case 4:
                _i++;
                return [3 /*break*/, 2];
            case 5: return [2 /*return*/, totalSize];
        }
    });
}); };
exports.getShallowDirectorySize = getShallowDirectorySize;
/**
* Computes the size (in bytes) of all files in a directory at the root level. Synchronously.
*/
var getShallowDirectorySizeSync = function (directory) {
    var files = fs.readdirSync(directory);
    var totalSize = 0;
    for (var i = 0; i < files.length; i++) {
        totalSize += fs.statSync(path.join(directory, files[i])).size;
    }
    return totalSize;
};
exports.getShallowDirectorySizeSync = getShallowDirectorySizeSync;
/**
* Computes the size (in bytes) of a file asynchronously.
*/
var getShallowFileSize = function (filePath) { return __awaiter(void 0, void 0, void 0, function () {
    var fileStats;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, exports.statAsync(filePath)];
            case 1:
                fileStats = _a.sent();
                if (fileStats.isFile()) {
                    return [2 /*return*/, fileStats.size];
                }
                return [2 /*return*/];
        }
    });
}); };
exports.getShallowFileSize = getShallowFileSize;
//# sourceMappingURL=FileSystemHelper.js.map