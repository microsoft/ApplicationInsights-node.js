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
exports.FileAccessControl = void 0;
var fs = require("fs");
var os = require("os");
var child_process = require("child_process");
var Logging = require("./Logging");
var FileAccessControl = /** @class */ (function () {
    function FileAccessControl() {
    }
    // Check if file access control could be enabled
    FileAccessControl.checkFileProtection = function () {
        if (!FileAccessControl.OS_PROVIDES_FILE_PROTECTION && !FileAccessControl.OS_FILE_PROTECTION_CHECKED) {
            FileAccessControl.OS_FILE_PROTECTION_CHECKED = true;
            // Node's chmod levels do not appropriately restrict file access on Windows
            // Use the built-in command line tool ICACLS on Windows to properly restrict
            // access to the temporary directory used for disk retry mode.
            if (FileAccessControl.USE_ICACLS) {
                // This should be async - but it's currently safer to have this synchronous
                // This guarantees we can immediately fail setDiskRetryMode if we need to
                try {
                    FileAccessControl.OS_PROVIDES_FILE_PROTECTION = fs.existsSync(FileAccessControl.ICACLS_PATH);
                }
                catch (e) {
                    // Ignore errors
                }
                if (!FileAccessControl.OS_PROVIDES_FILE_PROTECTION) {
                    Logging.warn(FileAccessControl.TAG, "Could not find ICACLS in expected location! This is necessary to use disk retry mode on Windows.");
                }
            }
            else {
                // chmod works everywhere else
                FileAccessControl.OS_PROVIDES_FILE_PROTECTION = true;
            }
        }
    };
    FileAccessControl.applyACLRules = function (directory) {
        return __awaiter(this, void 0, void 0, function () {
            var identity, ex_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!FileAccessControl.USE_ICACLS) return [3 /*break*/, 7];
                        if (!(FileAccessControl.ACLED_DIRECTORIES[directory] === undefined)) return [3 /*break*/, 6];
                        // Avoid multiple calls race condition by setting ACLED_DIRECTORIES to false for this directory immediately
                        // If batches are being failed faster than the processes spawned below return, some data won't be stored to disk
                        // This is better than the alternative of potentially infinitely spawned processes
                        FileAccessControl.ACLED_DIRECTORIES[directory] = false;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, this._getACLIdentity()];
                    case 2:
                        identity = _a.sent();
                        return [4 /*yield*/, this._runICACLS(this._getACLArguments(directory, identity))];
                    case 3:
                        _a.sent();
                        FileAccessControl.ACLED_DIRECTORIES[directory] = true;
                        return [3 /*break*/, 5];
                    case 4:
                        ex_1 = _a.sent();
                        FileAccessControl.ACLED_DIRECTORIES[directory] = false; // false is used to cache failed (vs undefined which is "not yet tried")
                        throw ex_1;
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        if (!FileAccessControl.ACLED_DIRECTORIES[directory]) {
                            throw new Error("Setting ACL restrictions did not succeed (cached result)");
                        }
                        _a.label = 7;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    FileAccessControl.applyACLRulesSync = function (directory) {
        if (FileAccessControl.USE_ICACLS) {
            // For performance, only run ACL rules if we haven't already during this session
            if (FileAccessControl.ACLED_DIRECTORIES[directory] === undefined) {
                this._runICACLSSync(this._getACLArguments(directory, this._getACLIdentitySync()));
                FileAccessControl.ACLED_DIRECTORIES[directory] = true; // If we get here, it succeeded. _runIACLSSync will throw on failures
                return;
            }
            else if (!FileAccessControl.ACLED_DIRECTORIES[directory]) { // falsy but not undefined
                throw new Error("Setting ACL restrictions did not succeed (cached result)");
            }
        }
    };
    FileAccessControl._runICACLS = function (args) {
        return new Promise(function (resolve, reject) {
            var aclProc = child_process.spawn(FileAccessControl.ICACLS_PATH, args, { windowsHide: true });
            aclProc.on("error", function (e) { return reject(e); });
            aclProc.on("close", function (code, signal) {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error("Setting ACL restrictions did not succeed (ICACLS returned code " + code + ")"));
                }
            });
        });
    };
    FileAccessControl._runICACLSSync = function (args) {
        // Some very old versions of Node (< 0.11) don't have this
        if (child_process.spawnSync) {
            var aclProc = child_process.spawnSync(FileAccessControl.ICACLS_PATH, args, { windowsHide: true });
            if (aclProc.error) {
                throw aclProc.error;
            }
            else if (aclProc.status !== 0) {
                throw new Error("Setting ACL restrictions did not succeed (ICACLS returned code " + aclProc.status + ")");
            }
        }
        else {
            throw new Error("Could not synchronously call ICACLS under current version of Node.js");
        }
    };
    FileAccessControl._getACLIdentity = function () {
        return new Promise(function (resolve, reject) {
            if (FileAccessControl.ACL_IDENTITY) {
                resolve(FileAccessControl.ACL_IDENTITY);
            }
            var psProc = child_process.spawn(FileAccessControl.POWERSHELL_PATH, ["-Command", "[System.Security.Principal.WindowsIdentity]::GetCurrent().Name"], {
                windowsHide: true,
                stdio: ["ignore", "pipe", "pipe"] // Needed to prevent hanging on Win 7
            });
            var data = "";
            psProc.stdout.on("data", function (d) { return data += d; });
            psProc.on("error", function (e) { return reject(e); });
            psProc.on("close", function (code, signal) {
                FileAccessControl.ACL_IDENTITY = data && data.trim();
                if (code === 0) {
                    resolve(FileAccessControl.ACL_IDENTITY);
                }
                else {
                    reject(new Error("Getting ACL identity did not succeed (PS returned code " + code + ")"));
                }
            });
        });
    };
    FileAccessControl._getACLIdentitySync = function () {
        if (FileAccessControl.ACL_IDENTITY) {
            return FileAccessControl.ACL_IDENTITY;
        }
        // Some very old versions of Node (< 0.11) don't have this
        if (child_process.spawnSync) {
            var psProc = child_process.spawnSync(FileAccessControl.POWERSHELL_PATH, ["-Command", "[System.Security.Principal.WindowsIdentity]::GetCurrent().Name"], {
                windowsHide: true,
                stdio: ["ignore", "pipe", "pipe"] // Needed to prevent hanging on Win 7
            });
            if (psProc.error) {
                throw psProc.error;
            }
            else if (psProc.status !== 0) {
                throw new Error("Getting ACL identity did not succeed (PS returned code " + psProc.status + ")");
            }
            FileAccessControl.ACL_IDENTITY = psProc.stdout && psProc.stdout.toString().trim();
            return FileAccessControl.ACL_IDENTITY;
        }
        else {
            throw new Error("Could not synchronously get ACL identity under current version of Node.js");
        }
    };
    FileAccessControl._getACLArguments = function (directory, identity) {
        return [directory,
            "/grant", "*S-1-5-32-544:(OI)(CI)F",
            "/grant", identity + ":(OI)(CI)F", // Full permission for current user
            "/inheritance:r"]; // Remove all inherited permissions
    };
    FileAccessControl.TAG = "FileAccessControl";
    FileAccessControl.ICACLS_PATH = process.env.systemdrive + "/windows/system32/icacls.exe";
    FileAccessControl.POWERSHELL_PATH = process.env.systemdrive + "/windows/system32/windowspowershell/v1.0/powershell.exe";
    FileAccessControl.ACLED_DIRECTORIES = {};
    FileAccessControl.ACL_IDENTITY = null;
    FileAccessControl.OS_FILE_PROTECTION_CHECKED = false;
    FileAccessControl.OS_PROVIDES_FILE_PROTECTION = false;
    FileAccessControl.USE_ICACLS = os.type() === "Windows_NT";
    return FileAccessControl;
}());
exports.FileAccessControl = FileAccessControl;
//# sourceMappingURL=FileAccessControl.js.map