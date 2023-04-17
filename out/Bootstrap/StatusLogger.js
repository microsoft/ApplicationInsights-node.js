"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusLogger = void 0;
var os = require("os");
var path = require("path");
var FileWriter_1 = require("./FileWriter");
var Constants_1 = require("../Declarations/Constants");
var StatusLogger = /** @class */ (function () {
    function StatusLogger(_writer, instrumentationKey) {
        if (_writer === void 0) { _writer = console; }
        if (instrumentationKey === void 0) { instrumentationKey = "unknown"; }
        this._writer = _writer;
        StatusLogger.DEFAULT_STATUS.Ikey = instrumentationKey;
    }
    StatusLogger.prototype.logStatus = function (data, cb) {
        if (typeof cb === "function" && this._writer instanceof FileWriter_1.FileWriter) {
            this._writer.callback = cb;
        }
        this._writer.log(data);
    };
    StatusLogger.DEFAULT_FILE_PATH = path.join(FileWriter_1.homedir, "status");
    StatusLogger.DEFAULT_FILE_NAME = "status_" + os.hostname() + "_" + process.pid + ".json";
    StatusLogger.DEFAULT_STATUS = {
        AgentInitializedSuccessfully: false,
        SDKPresent: false,
        Ikey: "unknown",
        AppType: "node.js",
        SdkVersion: Constants_1.APPLICATION_INSIGHTS_SDK_VERSION,
        MachineName: os.hostname(),
        PID: String(process.pid)
    };
    return StatusLogger;
}());
exports.StatusLogger = StatusLogger;
//# sourceMappingURL=StatusLogger.js.map