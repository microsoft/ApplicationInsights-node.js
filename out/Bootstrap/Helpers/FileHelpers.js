"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renameCurrentFile = exports.makeStatusDirs = exports.homedir = void 0;
var path = require("path");
var fs = require("fs");
var os = require("os");
exports.homedir = os.homedir ? os.homedir() : (process.env[(process.platform == "win32") ? "USERPROFILE" : "HOME"]);
/**
 * Zero dependencies: recursive mkdir
 */
function mkDirByPathSync(HOME_DIR, targetDir, _a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.isRelativeToScript, isRelativeToScript = _c === void 0 ? false : _c;
    var sep = path.sep;
    var initDir = path.isAbsolute(targetDir) ? sep : "";
    var baseDir = isRelativeToScript ? __dirname : ".";
    return targetDir.split(sep).reduce(function (parentDir, childDir) {
        var curDir = path.resolve(baseDir, parentDir, childDir);
        try {
            // Don't try to recreate homedir
            if (HOME_DIR.indexOf(curDir) === -1) {
                fs.mkdirSync(curDir);
            }
        }
        catch (err) {
            if (err.code === "EEXIST") { // curDir already exists!
                return curDir;
            }
            // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
            if (err.code === "ENOENT") { // Throw the original parentDir error on curDir `ENOENT` failure.
                throw new Error("EACCES: permission denied, mkdir \"" + parentDir + "\"");
            }
            var caughtErr = ["EACCES", "EPERM", "EISDIR"].indexOf(err.code) > -1;
            if (!caughtErr || caughtErr && curDir === path.resolve(targetDir)) {
                throw err; // Throw if it's just the last created dir.
            }
        }
        return curDir;
    }, initDir);
}
function makeStatusDirs(filepath) {
    try {
        mkDirByPathSync(exports.homedir, filepath.replace(/\\/g, path.sep).replace(/\//g, path.sep));
        return true;
    }
    catch (e) {
        console.error("Error creating Application Insights status folder", e);
        return false;
    }
}
exports.makeStatusDirs = makeStatusDirs;
function renameCurrentFile(filepath, filename, callback) {
    var fullpath = path.join(filepath, filename);
    var basename = path.basename(filename, path.extname(filename));
    var stats = fs.stat(fullpath, function (statsErr, stats) {
        if (statsErr) {
            return callback(statsErr);
        }
        var createDate = new Date(stats.birthtime);
        var destfilename = basename + "-" +
            createDate.toISOString().replace(/[T:\.]/g, "_").replace("Z", "") +
            path.extname(filename) + ".old";
        var destfullpath = path.join(filepath, destfilename);
        fs.rename(fullpath, destfullpath, function (renameErr) {
            if (typeof callback === "function") {
                callback(renameErr, destfullpath);
            }
        });
    });
}
exports.renameCurrentFile = renameCurrentFile;
//# sourceMappingURL=FileHelpers.js.map