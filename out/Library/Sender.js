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
var fs = require("fs");
var os = require("os");
var path = require("path");
var zlib = require("zlib");
var Constants = require("../Declarations/Constants");
var AutoCollectHttpDependencies = require("../AutoCollection/HttpDependencies");
var FileSystemHelper = require("./FileSystemHelper");
var Util = require("./Util");
var url_1 = require("url");
var Logging = require("./Logging");
var FileAccessControl_1 = require("./FileAccessControl");
var legacyThrottleStatusCode = 439; //  - Too many requests and refresh cache
var throttleStatusCode = 402; // Monthly Quota Exceeded (new SDK)
var RESPONSE_CODES_INDICATING_REACHED_BREEZE = [200, 206, 402, 408, 429, 439, 500];
var Sender = /** @class */ (function () {
    function Sender(config, getAuthorizationHandler, onSuccess, onError, statsbeat, isStatsbeatSender, shutdownStatsbeat) {
        this._redirectedHost = null;
        this._config = config;
        this._onSuccess = onSuccess;
        this._onError = onError;
        this._statsbeat = statsbeat;
        this._enableDiskRetryMode = false;
        this._resendInterval = Sender.WAIT_BETWEEN_RESEND;
        this._maxBytesOnDisk = Sender.MAX_BYTES_ON_DISK;
        this._numConsecutiveFailures = 0;
        this._numConsecutiveRedirects = 0;
        this._resendTimer = null;
        this._getAuthorizationHandler = getAuthorizationHandler;
        this._fileCleanupTimer = null;
        // tmpdir is /tmp for *nix and USERDIR/AppData/Local/Temp for Windows
        this._tempDir = path.join(os.tmpdir(), Sender.TEMPDIR_PREFIX + this._config.instrumentationKey);
        this._isStatsbeatSender = isStatsbeatSender || false;
        this._shutdownStatsbeat = shutdownStatsbeat;
        this._failedToIngestCounter = 0;
        this._statsbeatHasReachedIngestionAtLeastOnce = false;
    }
    /**
    * Enable or disable offline mode
    */
    Sender.prototype.setDiskRetryMode = function (value, resendInterval, maxBytesOnDisk) {
        var _this = this;
        if (value) {
            FileAccessControl_1.FileAccessControl.checkFileProtection(); // Only check file protection when disk retry is enabled
        }
        this._enableDiskRetryMode = FileAccessControl_1.FileAccessControl.OS_PROVIDES_FILE_PROTECTION && value;
        if (typeof resendInterval === "number" && resendInterval >= 0) {
            this._resendInterval = Math.floor(resendInterval);
        }
        if (typeof maxBytesOnDisk === "number" && maxBytesOnDisk >= 0) {
            this._maxBytesOnDisk = Math.floor(maxBytesOnDisk);
        }
        if (value && !FileAccessControl_1.FileAccessControl.OS_PROVIDES_FILE_PROTECTION) {
            this._enableDiskRetryMode = false;
            this._logWarn("Ignoring request to enable disk retry mode. Sufficient file protection capabilities were not detected.");
        }
        if (this._enableDiskRetryMode) {
            if (this._statsbeat) {
                this._statsbeat.addFeature(Constants.StatsbeatFeature.DISK_RETRY);
            }
            // Starts file cleanup task
            if (!this._fileCleanupTimer) {
                this._fileCleanupTimer = setTimeout(function () { _this._fileCleanupTask(); }, Sender.CLEANUP_TIMEOUT);
                this._fileCleanupTimer.unref();
            }
        }
        else {
            if (this._statsbeat) {
                this._statsbeat.removeFeature(Constants.StatsbeatFeature.DISK_RETRY);
            }
            if (this._fileCleanupTimer) {
                clearTimeout(this._fileCleanupTimer);
            }
        }
    };
    Sender.prototype.send = function (envelopes, callback) {
        return __awaiter(this, void 0, void 0, function () {
            var endpointUrl, endpointHost, options, authHandler, authError_1, errorMsg, batch_1, payload_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!envelopes) return [3 /*break*/, 5];
                        endpointUrl = this._redirectedHost || this._config.endpointUrl;
                        endpointHost = new url_1.URL(endpointUrl).hostname;
                        options = {
                            method: "POST",
                            withCredentials: false,
                            headers: {
                                "Content-Type": "application/x-json-stream"
                            }
                        };
                        authHandler = this._getAuthorizationHandler ? this._getAuthorizationHandler(this._config) : null;
                        if (!authHandler) return [3 /*break*/, 4];
                        if (this._statsbeat) {
                            this._statsbeat.addFeature(Constants.StatsbeatFeature.AAD_HANDLING);
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        // Add bearer token
                        return [4 /*yield*/, authHandler.addAuthorizationHeader(options)];
                    case 2:
                        // Add bearer token
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        authError_1 = _a.sent();
                        errorMsg = "Failed to get AAD bearer token for the Application.";
                        if (this._enableDiskRetryMode) {
                            errorMsg += "This batch of telemetry items will be retried. ";
                            this._storeToDisk(envelopes);
                        }
                        errorMsg += "Error:" + authError_1.toString();
                        this._logWarn(errorMsg);
                        if (typeof callback === "function") {
                            callback(errorMsg);
                        }
                        return [2 /*return*/]; // If AAD auth fails do not send to Breeze
                    case 4:
                        batch_1 = "";
                        envelopes.forEach(function (envelope) {
                            var payload = Util.stringify(envelope);
                            if (typeof payload !== "string") {
                                return;
                            }
                            batch_1 += payload + "\n";
                        });
                        // Remove last \n
                        if (batch_1.length > 0) {
                            batch_1 = batch_1.substring(0, batch_1.length - 1);
                        }
                        payload_1 = Buffer.from ? Buffer.from(batch_1) : new Buffer(batch_1);
                        zlib.gzip(payload_1, function (err, buffer) {
                            var dataToSend = buffer;
                            if (err) {
                                _this._logWarn(Util.dumpObj(err));
                                dataToSend = payload_1; // something went wrong so send without gzip
                                options.headers["Content-Length"] = payload_1.length.toString();
                            }
                            else {
                                options.headers["Content-Encoding"] = "gzip";
                                options.headers["Content-Length"] = buffer.length.toString();
                            }
                            _this._logInfo(Util.dumpObj(options));
                            // Ensure this request is not captured by auto-collection.
                            options[AutoCollectHttpDependencies.disableCollectionRequestOption] = true;
                            var startTime = +new Date();
                            var requestCallback = function (res) {
                                res.setEncoding("utf-8");
                                //returns empty if the data is accepted
                                var responseString = "";
                                res.on("data", function (data) {
                                    responseString += data;
                                });
                                res.on("end", function () {
                                    var endTime = +new Date();
                                    var duration = endTime - startTime;
                                    _this._numConsecutiveFailures = 0;
                                    // Handling of Statsbeat instance sending data, should turn it off if is not able to reach ingestion endpoint
                                    if (_this._isStatsbeatSender && !_this._statsbeatHasReachedIngestionAtLeastOnce) {
                                        if (RESPONSE_CODES_INDICATING_REACHED_BREEZE.includes(res.statusCode)) {
                                            _this._statsbeatHasReachedIngestionAtLeastOnce = true;
                                        }
                                        else {
                                            _this._statsbeatFailedToIngest();
                                        }
                                    }
                                    if (_this._statsbeat) {
                                        if (res.statusCode == throttleStatusCode || res.statusCode == legacyThrottleStatusCode) { // Throttle
                                            _this._statsbeat.countThrottle(Constants.StatsbeatNetworkCategory.Breeze, endpointHost, res.statusCode);
                                        }
                                        else {
                                            _this._statsbeat.countRequest(Constants.StatsbeatNetworkCategory.Breeze, endpointHost, duration, res.statusCode === 200, res.statusCode);
                                        }
                                    }
                                    if (_this._enableDiskRetryMode) {
                                        // try to send any cached events if the user is back online
                                        if (res.statusCode === 200) {
                                            if (!_this._resendTimer) {
                                                _this._resendTimer = setTimeout(function () {
                                                    _this._resendTimer = null;
                                                    _this._sendFirstFileOnDisk();
                                                }, _this._resendInterval);
                                                _this._resendTimer.unref();
                                            }
                                        }
                                        else if (_this._isRetriable(res.statusCode)) {
                                            try {
                                                if (_this._statsbeat) {
                                                    _this._statsbeat.countRetry(Constants.StatsbeatNetworkCategory.Breeze, endpointHost, res.statusCode);
                                                }
                                                var breezeResponse = JSON.parse(responseString);
                                                var filteredEnvelopes_1 = [];
                                                if (breezeResponse.errors) {
                                                    breezeResponse.errors.forEach(function (error) {
                                                        // Only retry errors if 429, 500 or 503 response codes
                                                        if (error.statusCode == 429 || error.statusCode == 500 || error.statusCode == 503) {
                                                            filteredEnvelopes_1.push(envelopes[error.index]);
                                                        }
                                                    });
                                                    if (filteredEnvelopes_1.length > 0) {
                                                        _this._storeToDisk(filteredEnvelopes_1);
                                                    }
                                                }
                                            }
                                            catch (ex) {
                                                _this._storeToDisk(envelopes); // Retriable status code with not valid Breeze response
                                            }
                                        }
                                    }
                                    // Redirect handling
                                    if (res.statusCode === 307 || // Temporary Redirect
                                        res.statusCode === 308) { // Permanent Redirect
                                        _this._numConsecutiveRedirects++;
                                        // To prevent circular redirects
                                        if (_this._numConsecutiveRedirects < 10) {
                                            // Try to get redirect header
                                            var locationHeader = res.headers["location"] ? res.headers["location"].toString() : null;
                                            if (locationHeader) {
                                                _this._redirectedHost = locationHeader;
                                                // Send to redirect endpoint as HTTPs library doesn't handle redirect automatically
                                                _this.send(envelopes, callback);
                                            }
                                        }
                                        else {
                                            var circularRedirectError = { name: "Circular Redirect", message: "Error sending telemetry because of circular redirects." };
                                            if (_this._statsbeat) {
                                                _this._statsbeat.countException(Constants.StatsbeatNetworkCategory.Breeze, endpointHost, circularRedirectError);
                                            }
                                            if (typeof callback === "function") {
                                                callback("Error sending telemetry because of circular redirects.");
                                            }
                                        }
                                    }
                                    else {
                                        _this._numConsecutiveRedirects = 0;
                                        if (typeof callback === "function") {
                                            callback(responseString);
                                        }
                                        _this._logInfo(responseString);
                                        if (typeof _this._onSuccess === "function") {
                                            _this._onSuccess(responseString);
                                        }
                                    }
                                });
                            };
                            var req = Util.makeRequest(_this._config, endpointUrl, options, requestCallback);
                            // Needed as of Node.js v13 default timeouts on HTTP requests are no longer default
                            // Timeout should trigger the request on error function to run
                            req.setTimeout(Sender.HTTP_TIMEOUT, function () {
                                _this._requestTimedOut = true;
                                req.abort();
                            });
                            req.on("error", function (error) {
                                if (_this._isStatsbeatSender && !_this._statsbeatHasReachedIngestionAtLeastOnce) {
                                    _this._statsbeatFailedToIngest();
                                }
                                // todo: handle error codes better (group to recoverable/non-recoverable and persist)
                                _this._numConsecutiveFailures++;
                                if (_this._statsbeat) {
                                    _this._statsbeat.countException(Constants.StatsbeatNetworkCategory.Breeze, endpointHost, error);
                                }
                                // Only use warn level if retries are disabled or we've had some number of consecutive failures sending data
                                // This is because warn level is printed in the console by default, and we don't want to be noisy for transient and self-recovering errors
                                // Continue informing on each failure if verbose logging is being used
                                if (!_this._enableDiskRetryMode || _this._numConsecutiveFailures > 0 && _this._numConsecutiveFailures % Sender.MAX_CONNECTION_FAILURES_BEFORE_WARN === 0) {
                                    var notice = "Ingestion endpoint could not be reached. This batch of telemetry items has been lost. Use Disk Retry Caching to enable resending of failed telemetry. Error:";
                                    if (_this._enableDiskRetryMode) {
                                        notice = "Ingestion endpoint could not be reached " + _this._numConsecutiveFailures + " consecutive times. There may be resulting telemetry loss. Most recent error:";
                                    }
                                    _this._logWarn(notice, Util.dumpObj(error));
                                }
                                else {
                                    var notice = "Transient failure to reach ingestion endpoint. This batch of telemetry items will be retried. Error:";
                                    _this._logInfo(notice, Util.dumpObj(error));
                                }
                                _this._onErrorHelper(error);
                                if (typeof callback === "function") {
                                    if (error) {
                                        // If the error type is a timeout we want to provide more meaningful output
                                        if (_this._requestTimedOut) {
                                            error.name = "telemetry timeout";
                                            error.message = "telemetry request timed out";
                                        }
                                        callback(Util.dumpObj(error));
                                    }
                                    else {
                                        callback("Error sending telemetry");
                                    }
                                }
                                if (_this._enableDiskRetryMode) {
                                    _this._storeToDisk(envelopes);
                                }
                            });
                            req.write(dataToSend);
                            req.end();
                        });
                        _a.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    Sender.prototype.saveOnCrash = function (envelopes) {
        if (this._enableDiskRetryMode) {
            this._storeToDiskSync(Util.stringify(envelopes));
        }
    };
    Sender.prototype._isRetriable = function (statusCode) {
        return (statusCode === 206 || // Partial Accept
            statusCode === 401 || // Unauthorized
            statusCode === 403 || // Forbidden
            statusCode === 408 || // Timeout
            statusCode === 429 || // Too many requests
            statusCode === 500 || // Server Error
            statusCode === 502 || // Bad Gateway
            statusCode === 503 || // Server Unavailable
            statusCode === 504 // Gateway Timeout
        );
    };
    Sender.prototype._logInfo = function (message) {
        var optionalParams = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            optionalParams[_i - 1] = arguments[_i];
        }
        if (!this._isStatsbeatSender) {
            Logging.info(Sender.TAG, message, optionalParams);
        }
    };
    Sender.prototype._logWarn = function (message) {
        var optionalParams = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            optionalParams[_i - 1] = arguments[_i];
        }
        if (!this._isStatsbeatSender) {
            Logging.warn(Sender.TAG, message, optionalParams);
        }
    };
    Sender.prototype._statsbeatFailedToIngest = function () {
        if (this._shutdownStatsbeat) { // Check if callback is available
            this._failedToIngestCounter++;
            if (this._failedToIngestCounter >= 3) {
                this._shutdownStatsbeat();
            }
        }
    };
    /**
     * Stores the payload as a json file on disk in the temp directory
     */
    Sender.prototype._storeToDisk = function (envelopes) {
        return __awaiter(this, void 0, void 0, function () {
            var ex_1, ex_2, size, ex_3, fileName, fileFullPath, ex_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        this._logInfo("Checking existence of data storage directory: " + this._tempDir);
                        return [4 /*yield*/, FileSystemHelper.confirmDirExists(this._tempDir)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        ex_1 = _a.sent();
                        this._logWarn("Failed to create folder to put telemetry: " + Util.dumpObj(ex_1));
                        this._onErrorHelper(ex_1);
                        return [2 /*return*/];
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, FileAccessControl_1.FileAccessControl.applyACLRules(this._tempDir)];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        ex_2 = _a.sent();
                        this._logWarn("Failed to apply file access control to folder: " + Util.dumpObj(ex_2));
                        this._onErrorHelper(ex_2);
                        return [2 /*return*/];
                    case 6:
                        _a.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, FileSystemHelper.getShallowDirectorySize(this._tempDir)];
                    case 7:
                        size = _a.sent();
                        if (size > this._maxBytesOnDisk) {
                            this._logWarn("Not saving data due to max size limit being met. Directory size in bytes is: " + size);
                            return [2 /*return*/];
                        }
                        return [3 /*break*/, 9];
                    case 8:
                        ex_3 = _a.sent();
                        this._logWarn("Failed to read directory for retriable telemetry: " + Util.dumpObj(ex_3));
                        this._onErrorHelper(ex_3);
                        return [2 /*return*/];
                    case 9:
                        _a.trys.push([9, 11, , 12]);
                        fileName = new Date().getTime() + ".ai.json";
                        fileFullPath = path.join(this._tempDir, fileName);
                        // Mode 600 is w/r for creator and no read access for others (only applies on *nix)
                        // For Windows, ACL rules are applied to the entire directory (see logic in _confirmDirExists and _applyACLRules)
                        this._logInfo("saving data to disk at: " + fileFullPath);
                        return [4 /*yield*/, FileSystemHelper.writeFileAsync(fileFullPath, Util.stringify(envelopes), { mode: 384 })];
                    case 10:
                        _a.sent();
                        return [3 /*break*/, 12];
                    case 11:
                        ex_4 = _a.sent();
                        this._logWarn("Failed to persist telemetry to disk: " + Util.dumpObj(ex_4));
                        this._onErrorHelper(ex_4);
                        return [2 /*return*/];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Stores the payload as a json file on disk using sync file operations
     * this is used when storing data before crashes
     */
    Sender.prototype._storeToDiskSync = function (payload) {
        try {
            this._logInfo("Checking existence of data storage directory: " + this._tempDir);
            if (!fs.existsSync(this._tempDir)) {
                fs.mkdirSync(this._tempDir);
            }
            // Make sure permissions are valid
            FileAccessControl_1.FileAccessControl.applyACLRulesSync(this._tempDir);
            var dirSize = FileSystemHelper.getShallowDirectorySizeSync(this._tempDir);
            if (dirSize > this._maxBytesOnDisk) {
                this._logInfo("Not saving data due to max size limit being met. Directory size in bytes is: " + dirSize);
                return;
            }
            //create file - file name for now is the timestamp, a better approach would be a UUID but that
            //would require an external dependency
            var fileName = new Date().getTime() + ".ai.json";
            var fileFullPath = path.join(this._tempDir, fileName);
            // Mode 600 is w/r for creator and no access for anyone else (only applies on *nix)
            this._logInfo("saving data before crash to disk at: " + fileFullPath);
            fs.writeFileSync(fileFullPath, payload, { mode: 384 });
        }
        catch (error) {
            this._logWarn("Error while saving data to disk: " + Util.dumpObj(error));
            this._onErrorHelper(error);
        }
    };
    /**
     * Check for temp telemetry files
     * reads the first file if exist, deletes it and tries to send its load
     */
    Sender.prototype._sendFirstFileOnDisk = function () {
        return __awaiter(this, void 0, void 0, function () {
            var files, firstFile, filePath, buffer, envelopes, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, FileSystemHelper.readdirAsync(this._tempDir)];
                    case 1:
                        files = _a.sent();
                        files = files.filter(function (f) { return path.basename(f).indexOf(".ai.json") > -1; });
                        if (!(files.length > 0)) return [3 /*break*/, 5];
                        firstFile = files[0];
                        filePath = path.join(this._tempDir, firstFile);
                        return [4 /*yield*/, FileSystemHelper.readFileAsync(filePath)];
                    case 2:
                        buffer = _a.sent();
                        // delete the file first to prevent double sending
                        return [4 /*yield*/, FileSystemHelper.unlinkAsync(filePath)];
                    case 3:
                        // delete the file first to prevent double sending
                        _a.sent();
                        envelopes = JSON.parse(buffer.toString());
                        return [4 /*yield*/, this.send(envelopes)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        err_1 = _a.sent();
                        this._onErrorHelper(err_1);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    Sender.prototype._onErrorHelper = function (error) {
        if (typeof this._onError === "function") {
            this._onError(error);
        }
    };
    Sender.prototype._fileCleanupTask = function () {
        return __awaiter(this, void 0, void 0, function () {
            var files, i, fileCreationDate, expired, filePath, err_2;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, FileSystemHelper.readdirAsync(this._tempDir)];
                    case 1:
                        files = _a.sent();
                        files = files.filter(function (f) { return path.basename(f).indexOf(".ai.json") > -1; });
                        if (!(files.length > 0)) return [3 /*break*/, 5];
                        i = 0;
                        _a.label = 2;
                    case 2:
                        if (!(i < files.length)) return [3 /*break*/, 5];
                        fileCreationDate = new Date(parseInt(files[i].split(".ai.json")[0]));
                        expired = new Date(+(new Date()) - Sender.FILE_RETEMPTION_PERIOD) > fileCreationDate;
                        if (!expired) return [3 /*break*/, 4];
                        filePath = path.join(this._tempDir, files[i]);
                        return [4 /*yield*/, FileSystemHelper.unlinkAsync(filePath).catch(function (err) {
                                _this._onErrorHelper(err);
                            })];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        i++;
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        err_2 = _a.sent();
                        if (err_2.code != "ENOENT") {
                            this._onErrorHelper(err_2);
                        }
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    Sender.TAG = "Sender";
    // the amount of time the SDK will wait between resending cached data, this buffer is to avoid any throttling from the service side
    Sender.WAIT_BETWEEN_RESEND = 60 * 1000; // 1 minute
    Sender.MAX_BYTES_ON_DISK = 50 * 1024 * 1024; // 50 mb
    Sender.MAX_CONNECTION_FAILURES_BEFORE_WARN = 5;
    Sender.CLEANUP_TIMEOUT = 60 * 60 * 1000; // 1 hour
    Sender.FILE_RETEMPTION_PERIOD = 7 * 24 * 60 * 60 * 1000; // 7 days
    Sender.TEMPDIR_PREFIX = "appInsights-node";
    Sender.HTTP_TIMEOUT = 20000; // 20 seconds
    return Sender;
}());
module.exports = Sender;
//# sourceMappingURL=Sender.js.map