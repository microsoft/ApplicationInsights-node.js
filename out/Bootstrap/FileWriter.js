"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileWriter = exports.homedir = void 0;
var path = require("path");
var fs = require("fs");
var FileHelpers = require("./Helpers/FileHelpers");
exports.homedir = FileHelpers.homedir;
var FileWriter = /** @class */ (function () {
    // leave at "keep at single file only", "write up to certain size limit", "clear old file on process startup"
    function FileWriter(_filepath, _filename, options) {
        this._filepath = _filepath;
        this._filename = _filename;
        this.callback = function (_err) { }; // no-op
        this._ready = false;
        this._options = __assign(__assign({}, FileWriter.DEFAULT_OPTIONS), options);
        this._ready = FileWriter.isNodeVersionCompatible() && FileHelpers.makeStatusDirs(this._filepath);
        if (this._options.deleteOnExit) {
            FileWriter._addCloseHandler();
            FileWriter._fullpathsToDelete.push(path.join(this._filepath, this._filename));
        }
    }
    FileWriter.isNodeVersionCompatible = function () {
        var majVer = process.versions.node.split(".")[0];
        return parseInt(majVer) >= 1;
    };
    FileWriter.prototype.log = function (message) {
        var _this = this;
        if (this._ready) {
            var data_1 = typeof message === "object"
                ? JSON.stringify(message)
                : message.toString();
            // Check if existing file needs to be renamed
            this._shouldRenameFile(function (err, shouldRename) {
                if (err)
                    return;
                if (shouldRename) {
                    if (_this._options.renamePolicy === "rolling") {
                        FileHelpers.renameCurrentFile(_this._filepath, _this._filename, function (renameErr, renamedFullpath) {
                            if (renameErr)
                                return;
                            FileWriter._fullpathsToDelete.push(renamedFullpath);
                            _this._options.append
                                ? _this._appendFile(data_1 + "\n")
                                : _this._writeFile(data_1);
                        });
                    }
                    else if (_this._options.renamePolicy === "overwrite") {
                        // Clear the current file
                        _this._writeFile(data_1);
                    }
                    else if (_this._options.renamePolicy === "stop") {
                        // Stop future logging
                        _this._ready = false;
                    }
                }
                else {
                    _this._options.append
                        ? _this._appendFile(data_1 + "\n")
                        : _this._writeFile(data_1);
                }
            });
        }
    };
    FileWriter.prototype.error = function (message) {
        this.log(message);
    };
    FileWriter.prototype._appendFile = function (message) {
        var _this = this;
        var fullpath = path.join(this._filepath, this._filename);
        fs.appendFile(fullpath, message, function (err) {
            _this.callback(err);
        });
    };
    FileWriter.prototype._writeFile = function (message) {
        var fullpath = path.join(this._filepath, this._filename);
        fs.writeFile(fullpath, message, { mode: this._options.chmod }, this.callback);
    };
    FileWriter._addCloseHandler = function () {
        if (!FileWriter._listenerAttached) {
            process.on("exit", function () {
                FileWriter._fullpathsToDelete.forEach(function (filename) {
                    try {
                        fs.unlinkSync(filename);
                    }
                    catch (err) { /** ignore errors */ }
                });
            });
            FileWriter._listenerAttached = true;
        }
    };
    FileWriter.prototype._shouldRenameFile = function (callback) {
        var _this = this;
        var fullpath = path.join(this._filepath, this._filename);
        fs.stat(fullpath, function (err, stats) {
            if (err) {
                if (err.code === "ENOENT" && typeof callback === "function") {
                    callback(null, false);
                }
                else if (typeof callback === "function") {
                    callback(err);
                }
                return;
            }
            if (stats.size > _this._options.sizeLimit) {
                callback(null, true);
            }
            else {
                var createDate = new Date(stats.birthtime);
                var currentDate = new Date();
                var result = (createDate.getUTCDate() !== currentDate.getUTCDate() ||
                    createDate.getUTCMonth() !== currentDate.getUTCMonth() ||
                    createDate.getUTCFullYear() !== currentDate.getUTCFullYear());
                callback(null, result);
            }
        });
    };
    FileWriter._fullpathsToDelete = [];
    FileWriter._listenerAttached = false;
    FileWriter.DEFAULT_OPTIONS = {
        append: false,
        deleteOnExit: true,
        sizeLimit: 10 * 1024,
        renamePolicy: "stop",
        chmod: 420 // rw/r/r
    };
    return FileWriter;
}());
exports.FileWriter = FileWriter;
//# sourceMappingURL=FileWriter.js.map