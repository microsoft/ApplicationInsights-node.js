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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var fs = require("fs");
var os = require("os");
var path = require("path");
var FileSystemHelper = require("./FileSystemHelper");
var InternalAzureLogger = /** @class */ (function () {
    function InternalAzureLogger() {
        var _this = this;
        this.TAG = "Logger";
        this._cleanupTimeOut = 60 * 30 * 1000; // 30 minutes;
        this._logToFile = false;
        this._logToConsole = true;
        var logDestination = process.env.APPLICATIONINSIGHTS_LOG_DESTINATION; // destination can be one of file, console or file+console
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
        var logFilePath = process.env.APPLICATIONINSIGHTS_LOGDIR;
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
        if (this._logToFile) {
            if (!InternalAzureLogger._fileCleanupTimer) {
                InternalAzureLogger._fileCleanupTimer = setInterval(function () { _this._fileCleanupTask(); }, this._cleanupTimeOut);
                InternalAzureLogger._fileCleanupTimer.unref();
            }
        }
    }
    InternalAzureLogger.prototype.info = function (message) {
        var optionalParams = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            optionalParams[_i - 1] = arguments[_i];
        }
        var args = message ? __spreadArrays([message], optionalParams) : optionalParams;
        if (this._logToFile) {
            this._storeToDisk(args);
        }
        if (this._logToConsole) {
            console.info.apply(console, args);
        }
    };
    InternalAzureLogger.prototype.warning = function (message) {
        var optionalParams = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            optionalParams[_i - 1] = arguments[_i];
        }
        var args = message ? __spreadArrays([message], optionalParams) : optionalParams;
        if (this._logToFile) {
            this._storeToDisk(args);
        }
        if (this._logToConsole) {
            console.warn.apply(console, args);
        }
    };
    InternalAzureLogger.getInstance = function () {
        if (!InternalAzureLogger._instance) {
            InternalAzureLogger._instance = new InternalAzureLogger();
        }
        return InternalAzureLogger._instance;
    };
    InternalAzureLogger.prototype._storeToDisk = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var data, err_1, appendError_1, err_2, size, err_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        data = args + "\r\n";
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, FileSystemHelper.confirmDirExists(this._tempDir)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        console.log(this.TAG, "Failed to create directory for log file: " + (err_1 && err_1.message));
                        return [2 /*return*/];
                    case 4:
                        _a.trys.push([4, 6, , 11]);
                        return [4 /*yield*/, FileSystemHelper.accessAsync(this._fileFullPath, fs.constants.F_OK)];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 11];
                    case 6:
                        appendError_1 = _a.sent();
                        _a.label = 7;
                    case 7:
                        _a.trys.push([7, 9, , 10]);
                        return [4 /*yield*/, FileSystemHelper.appendFileAsync(this._fileFullPath, data)];
                    case 8:
                        _a.sent();
                        return [2 /*return*/];
                    case 9:
                        err_2 = _a.sent();
                        console.log(this.TAG, "Failed to put log into file: " + (appendError_1 && appendError_1.message));
                        return [2 /*return*/];
                    case 10: return [3 /*break*/, 11];
                    case 11:
                        _a.trys.push([11, 17, , 18]);
                        return [4 /*yield*/, FileSystemHelper.getShallowFileSize(this._fileFullPath)];
                    case 12:
                        size = _a.sent();
                        if (!(size > this.maxSizeBytes)) return [3 /*break*/, 14];
                        return [4 /*yield*/, this._createBackupFile(data)];
                    case 13:
                        _a.sent();
                        return [3 /*break*/, 16];
                    case 14: return [4 /*yield*/, FileSystemHelper.appendFileAsync(this._fileFullPath, data)];
                    case 15:
                        _a.sent();
                        _a.label = 16;
                    case 16: return [3 /*break*/, 18];
                    case 17:
                        err_3 = _a.sent();
                        console.log(this.TAG, "Failed to create backup file: " + (err_3 && err_3.message));
                        return [3 /*break*/, 18];
                    case 18: return [2 /*return*/];
                }
            });
        });
    };
    InternalAzureLogger.prototype._createBackupFile = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var buffer, backupPath, err_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, 4, 5]);
                        return [4 /*yield*/, FileSystemHelper.readFileAsync(this._fileFullPath)];
                    case 1:
                        buffer = _a.sent();
                        backupPath = path.join(this._tempDir, new Date().getTime() + "." + this._logFileName);
                        return [4 /*yield*/, FileSystemHelper.writeFileAsync(backupPath, buffer)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 3:
                        err_4 = _a.sent();
                        console.log("Failed to generate backup log file", err_4);
                        return [3 /*break*/, 5];
                    case 4:
                        // Store logs
                        FileSystemHelper.writeFileAsync(this._fileFullPath, data);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    InternalAzureLogger.prototype._fileCleanupTask = function () {
        return __awaiter(this, void 0, void 0, function () {
            var files, totalFiles, i, pathToDelete, err_5;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, FileSystemHelper.readdirAsync(this._tempDir)];
                    case 1:
                        files = _a.sent();
                        // Filter only backup files
                        files = files.filter(function (f) { return path.basename(f).indexOf(_this._backUpNameFormat) > -1; });
                        // Sort by creation date
                        files.sort(function (a, b) {
                            // Check expiration
                            var aCreationDate = new Date(parseInt(a.split(_this._backUpNameFormat)[0]));
                            var bCreationDate = new Date(parseInt(b.split(_this._backUpNameFormat)[0]));
                            if (aCreationDate < bCreationDate) {
                                return -1;
                            }
                            if (aCreationDate >= bCreationDate) {
                                return 1;
                            }
                        });
                        totalFiles = files.length;
                        i = 0;
                        _a.label = 2;
                    case 2:
                        if (!(i < totalFiles - this.maxHistory)) return [3 /*break*/, 5];
                        pathToDelete = path.join(this._tempDir, files[i]);
                        return [4 /*yield*/, FileSystemHelper.unlinkAsync(pathToDelete)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        i++;
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        err_5 = _a.sent();
                        console.log(this.TAG, "Failed to cleanup log files: " + (err_5 && err_5.message));
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    InternalAzureLogger._fileCleanupTimer = null;
    return InternalAzureLogger;
}());
module.exports = InternalAzureLogger;
//# sourceMappingURL=InternalAzureLogger.js.map