import fs = require("fs");
import http = require("http");
import os = require("os");
import path = require("path");
import zlib = require("zlib");

import AuthorizationHandler = require("./AuthorizationHandler");
import Config = require("./Config")
import Contracts = require("../Declarations/Contracts");
import Constants = require("../Declarations/Constants");
import AutoCollectHttpDependencies = require("../AutoCollection/HttpDependencies");
import Statsbeat = require("../AutoCollection/Statsbeat");
import FileSystemHelper = require("./FileSystemHelper");
import Util = require("./Util");
import { URL } from "url";
import Logging = require("./Logging");
import { FileAccessControl } from "./FileAccessControl";

const legacyThrottleStatusCode = 439; //  - Too many requests and refresh cache
const throttleStatusCode = 402; // Monthly Quota Exceeded (new SDK)
const RESPONSE_CODES_INDICATING_REACHED_BREEZE = [200, 206, 402, 408, 429, 439, 500];

class Sender {
    private static TAG = "Sender";
    // the amount of time the SDK will wait between resending cached data, this buffer is to avoid any throttling from the service side
    public static WAIT_BETWEEN_RESEND = 60 * 1000; // 1 minute
    public static MAX_BYTES_ON_DISK = 50 * 1024 * 1024; // 50 mb
    public static MAX_CONNECTION_FAILURES_BEFORE_WARN = 5;
    public static CLEANUP_TIMEOUT = 60 * 60 * 1000; // 1 hour
    public static FILE_RETEMPTION_PERIOD = 7 * 24 * 60 * 60 * 1000; // 7 days
    public static TEMPDIR_PREFIX: string = "appInsights-node";
    public static HTTP_TIMEOUT: number = 20000; // 20 seconds

    private _config: Config;
    private _isStatsbeatSender: boolean;
    private _shutdownStatsbeat: () => void;
    private _failedToIngestCounter: number;
    private _statsbeatHasReachedIngestionAtLeastOnce: boolean;
    private _statsbeat: Statsbeat;
    private _onSuccess: (response: string) => void;
    private _onError: (error: Error) => void;
    private _getAuthorizationHandler: (config: Config) => AuthorizationHandler;
    private _enableDiskRetryMode: boolean;
    private _numConsecutiveFailures: number;
    private _numConsecutiveRedirects: number;
    private _resendTimer: NodeJS.Timer | null;
    private _fileCleanupTimer: NodeJS.Timer;
    private _redirectedHost: string = null;
    private _tempDir: string;
    private _requestTimedOut: boolean;
    protected _resendInterval: number;
    protected _maxBytesOnDisk: number;

    constructor(config: Config, getAuthorizationHandler?: (config: Config) => AuthorizationHandler, onSuccess?: (response: string) => void, onError?: (error: Error) => void, statsbeat?: Statsbeat, isStatsbeatSender?: boolean, shutdownStatsbeat?: () => void) {
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
    public setDiskRetryMode(value: boolean, resendInterval?: number, maxBytesOnDisk?: number) {
        if (value) {
            FileAccessControl.checkFileProtection(); // Only check file protection when disk retry is enabled
        }
        this._enableDiskRetryMode = FileAccessControl.OS_PROVIDES_FILE_PROTECTION && value;
        if (typeof resendInterval === "number" && resendInterval >= 0) {
            this._resendInterval = Math.floor(resendInterval);
        }
        if (typeof maxBytesOnDisk === "number" && maxBytesOnDisk >= 0) {
            this._maxBytesOnDisk = Math.floor(maxBytesOnDisk);
        }

        if (value && !FileAccessControl.OS_PROVIDES_FILE_PROTECTION) {
            this._enableDiskRetryMode = false;
            this._logWarn("Ignoring request to enable disk retry mode. Sufficient file protection capabilities were not detected.")
        }
        if (this._enableDiskRetryMode) {
            if (this._statsbeat) {
                this._statsbeat.addFeature(Constants.StatsbeatFeature.DISK_RETRY);
            }
            // Starts file cleanup task
            if (!this._fileCleanupTimer) {
                this._fileCleanupTimer = setTimeout(() => { this._fileCleanupTask(); }, Sender.CLEANUP_TIMEOUT);
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
    }

    public async send(envelopes: Contracts.EnvelopeTelemetry[], callback?: (v: string) => void) {
        if (envelopes) {
            var endpointUrl = this._redirectedHost || this._config.endpointUrl;

            var endpointHost = new URL(endpointUrl).hostname;

            // todo: investigate specifying an agent here: https://nodejs.org/api/http.html#http_class_http_agent
            var options = {
                method: "POST",
                withCredentials: false,
                headers: <{ [key: string]: string }>{
                    "Content-Type": "application/x-json-stream"
                }
            };

            let authHandler = this._getAuthorizationHandler ? this._getAuthorizationHandler(this._config) : null;
            if (authHandler) {
                if (this._statsbeat) {
                    this._statsbeat.addFeature(Constants.StatsbeatFeature.AAD_HANDLING);
                }
                try {
                    // Add bearer token
                    await authHandler.addAuthorizationHeader(options);
                }
                catch (authError) {
                    let errorMsg = "Failed to get AAD bearer token for the Application.";
                    if (this._enableDiskRetryMode) {
                        errorMsg += "This batch of telemetry items will be retried. ";
                        this._storeToDisk(envelopes);
                    }
                    errorMsg += "Error:" + authError.toString();
                    this._logWarn(errorMsg);

                    if (typeof callback === "function") {
                        callback(errorMsg);
                    }
                    return; // If AAD auth fails do not send to Breeze
                }
            }

            let batch: string = "";
            envelopes.forEach(envelope => {
                var payload: string = Util.stringify(envelope);
                if (typeof payload !== "string") {
                    return;
                }
                batch += payload + "\n";
            });
            // Remove last \n
            if (batch.length > 0) {
                batch = batch.substring(0, batch.length - 1);
            }

            let payload: Buffer = Buffer.from ? Buffer.from(batch) : new Buffer(batch);

            zlib.gzip(payload, (err, buffer) => {
                var dataToSend = buffer;
                if (err) {
                    this._logWarn(Util.dumpObj(err));
                    dataToSend = payload; // something went wrong so send without gzip
                    options.headers["Content-Length"] = payload.length.toString();
                } else {
                    options.headers["Content-Encoding"] = "gzip";
                    options.headers["Content-Length"] = buffer.length.toString();
                }

                this._logInfo(Util.dumpObj(options));

                // Ensure this request is not captured by auto-collection.
                (<any>options)[AutoCollectHttpDependencies.disableCollectionRequestOption] = true;

                let startTime = +new Date();

                var requestCallback = (res: http.ClientResponse) => {
                    res.setEncoding("utf-8");

                    //returns empty if the data is accepted
                    var responseString = "";
                    res.on("data", (data: string) => {
                        responseString += data;
                    });

                    res.on("end", () => {
                        let endTime = +new Date();
                        let duration = endTime - startTime;
                        this._numConsecutiveFailures = 0;
                        // Handling of Statsbeat instance sending data, should turn it off if is not able to reach ingestion endpoint
                        if (this._isStatsbeatSender && !this._statsbeatHasReachedIngestionAtLeastOnce) {
                            if (RESPONSE_CODES_INDICATING_REACHED_BREEZE.includes(res.statusCode)) {
                                this._statsbeatHasReachedIngestionAtLeastOnce = true;
                            }
                            else {
                                this._statsbeatFailedToIngest();
                            }
                        }
                        if (this._statsbeat) {
                            if (res.statusCode == throttleStatusCode || res.statusCode == legacyThrottleStatusCode) { // Throttle
                                this._statsbeat.countThrottle(Constants.StatsbeatNetworkCategory.Breeze, endpointHost, res.statusCode);
                            }
                            else {
                                this._statsbeat.countRequest(Constants.StatsbeatNetworkCategory.Breeze, endpointHost, duration, res.statusCode === 200, res.statusCode);
                            }
                        }
                        if (this._enableDiskRetryMode) {
                            // try to send any cached events if the user is back online
                            if (res.statusCode === 200) {
                                if (!this._resendTimer) {
                                    this._resendTimer = setTimeout(() => {
                                        this._resendTimer = null;
                                        this._sendFirstFileOnDisk()
                                    }, this._resendInterval);
                                    this._resendTimer.unref();
                                }
                            } else if (this._isRetriable(res.statusCode)) {
                                try {
                                    if (this._statsbeat) {
                                        this._statsbeat.countRetry(Constants.StatsbeatNetworkCategory.Breeze, endpointHost, res.statusCode);
                                    }
                                    const breezeResponse = JSON.parse(responseString) as Contracts.BreezeResponse;
                                    let filteredEnvelopes: Contracts.EnvelopeTelemetry[] = [];
                                    if (breezeResponse.errors) {
                                        breezeResponse.errors.forEach(error => {
                                            if (this._isRetriable(error.statusCode)) {
                                                filteredEnvelopes.push(envelopes[error.index]);
                                            }
                                        });
                                        if (filteredEnvelopes.length > 0) {
                                            this._storeToDisk(filteredEnvelopes);
                                        }
                                    }

                                }
                                catch (ex) {
                                    this._storeToDisk(envelopes); // Retriable status code with not valid Breeze response
                                }
                            }
                        }
                        // Redirect handling
                        if (res.statusCode === 307 || // Temporary Redirect
                            res.statusCode === 308) { // Permanent Redirect
                            this._numConsecutiveRedirects++;
                            // To prevent circular redirects
                            if (this._numConsecutiveRedirects < 10) {
                                // Try to get redirect header
                                const locationHeader = res.headers["location"] ? res.headers["location"].toString() : null;
                                if (locationHeader) {
                                    this._redirectedHost = locationHeader;
                                    // Send to redirect endpoint as HTTPs library doesn't handle redirect automatically
                                    this.send(envelopes, callback);
                                }
                            }
                            else {
                                let circularRedirectMessage = "Error sending telemetry because of circular redirects.";
                                if (this._statsbeat) {
                                    this._statsbeat.countException(Constants.StatsbeatNetworkCategory.Breeze, endpointHost, circularRedirectMessage);
                                }
                                if (typeof callback === "function") {
                                    callback(circularRedirectMessage);
                                }
                            }

                        }
                        else {
                            this._numConsecutiveRedirects = 0;
                            if (typeof callback === "function") {
                                callback(responseString);
                            }
                            this._logInfo(responseString);
                            if (typeof this._onSuccess === "function") {
                                this._onSuccess(responseString);
                            }
                        }
                    });
                };

                var req = Util.makeRequest(this._config, endpointUrl, options, requestCallback);

                // Needed as of Node.js v13 default timeouts on HTTP requests are no longer default
                // Timeout should trigger the request on error function to run
                req.setTimeout(Sender.HTTP_TIMEOUT, () => {
                    this._requestTimedOut = true;
                    req.abort();
                });

                req.on("error", (error: Error) => {
                    if (this._isStatsbeatSender && !this._statsbeatHasReachedIngestionAtLeastOnce) {
                        this._statsbeatFailedToIngest();
                    }
                    // todo: handle error codes better (group to recoverable/non-recoverable and persist)
                    this._numConsecutiveFailures++;
                    if (this._statsbeat) {
                        this._statsbeat.countException(Constants.StatsbeatNetworkCategory.Breeze, endpointHost, error.name);
                    }

                    // Only use warn level if retries are disabled or we've had some number of consecutive failures sending data
                    // This is because warn level is printed in the console by default, and we don't want to be noisy for transient and self-recovering errors
                    // Continue informing on each failure if verbose logging is being used
                    if (!this._enableDiskRetryMode || this._numConsecutiveFailures > 0 && this._numConsecutiveFailures % Sender.MAX_CONNECTION_FAILURES_BEFORE_WARN === 0) {
                        let notice = "Ingestion endpoint could not be reached. This batch of telemetry items has been lost. Use Disk Retry Caching to enable resending of failed telemetry. Error:";
                        if (this._enableDiskRetryMode) {
                            notice = `Ingestion endpoint could not be reached ${this._numConsecutiveFailures} consecutive times. There may be resulting telemetry loss. Most recent error:`;
                        }
                        this._logWarn(notice, Util.dumpObj(error));
                    } else {
                        let notice = "Transient failure to reach ingestion endpoint. This batch of telemetry items will be retried. Error:";
                        this._logInfo(notice, Util.dumpObj(error));
                    }
                    this._onErrorHelper(error);

                    if (typeof callback === "function") {
                        if (error) {
                            // If the error type is a timeout we want to provide more meaningful output
                            if (this._requestTimedOut) {
                                error.name = "telemetry timeout";
                                error.message = "telemetry request timed out";
                            }
                            callback(Util.dumpObj(error));
                        }
                        else {
                            callback("Error sending telemetry");
                        }
                    }

                    if (this._enableDiskRetryMode) {
                        this._storeToDisk(envelopes);
                    }
                });

                req.write(dataToSend);
                req.end();
            });
        }
    }

    public saveOnCrash(envelopes: Contracts.EnvelopeTelemetry[]) {
        if (this._enableDiskRetryMode) {
            this._storeToDiskSync(Util.stringify(envelopes));
        }
    }

    private _isRetriable(statusCode: number) {
        return (
            statusCode === 206 || // Partial Accept
            statusCode === 401 || // Unauthorized
            statusCode === 403 || // Forbidden
            statusCode === 408 || // Timeout
            statusCode === 429 || // Too many requests
            statusCode === 500 || // Server Error
            statusCode === 502 || // Bad Gateway
            statusCode === 503 || // Server Unavailable
            statusCode === 504 // Gateway Timeout
        );
    }

    private _logInfo(message?: any, ...optionalParams: any[]) {
        if (!this._isStatsbeatSender) {
            Logging.info(Sender.TAG, message, optionalParams);
        }
    }

    private _logWarn(message?: any, ...optionalParams: any[]) {
        if (!this._isStatsbeatSender) {
            Logging.warn(Sender.TAG, message, optionalParams);
        }
    }

    private _statsbeatFailedToIngest() {
        if (this._shutdownStatsbeat) { // Check if callback is available
            this._failedToIngestCounter++;
            if (this._failedToIngestCounter >= 3) {
                this._shutdownStatsbeat();
            }
        }
    }

    /**
     * Stores the payload as a json file on disk in the temp directory
     */
    private async _storeToDisk(envelopes: Contracts.EnvelopeTelemetry[]): Promise<void> {
        try {
            this._logInfo("Checking existence of data storage directory: " + this._tempDir);
            await FileSystemHelper.confirmDirExists(this._tempDir);
        }
        catch (ex) {
            this._logWarn("Failed to create folder to put telemetry: " + Util.dumpObj(ex));
            this._onErrorHelper(ex);
            return;
        }
        try {
            await FileAccessControl.applyACLRules(this._tempDir);
        }
        catch (ex) {
            this._logWarn("Failed to apply file access control to folder: " + Util.dumpObj(ex));
            this._onErrorHelper(ex);
            return;
        }
        try {
            let size = await FileSystemHelper.getShallowDirectorySize(this._tempDir);
            if (size > this._maxBytesOnDisk) {
                this._logWarn("Not saving data due to max size limit being met. Directory size in bytes is: " + size);
                return;
            }
            //create file - file name for now is the timestamp, a better approach would be a UUID but that
            //would require an external dependency
            var fileName = new Date().getTime() + ".ai.json";
            var fileFullPath = path.join(this._tempDir, fileName);

            // Mode 600 is w/r for creator and no read access for others (only applies on *nix)
            // For Windows, ACL rules are applied to the entire directory (see logic in _confirmDirExists and _applyACLRules)
            this._logInfo("saving data to disk at: " + fileFullPath);
            FileSystemHelper.writeFileAsync(fileFullPath, Util.stringify(envelopes), { mode: 0o600 });
        }
        catch (ex) {
            this._logWarn("Failed to persist telemetry to disk: " + Util.dumpObj(ex));
            this._onErrorHelper(ex);
            return;
        }
    }

    /**
     * Stores the payload as a json file on disk using sync file operations
     * this is used when storing data before crashes
     */
    private _storeToDiskSync(payload: any) {
        try {
            this._logInfo("Checking existence of data storage directory: " + this._tempDir);
            if (!fs.existsSync(this._tempDir)) {
                fs.mkdirSync(this._tempDir);
            }

            // Make sure permissions are valid
            FileAccessControl.applyACLRulesSync(this._tempDir);

            let dirSize = FileSystemHelper.getShallowDirectorySizeSync(this._tempDir);
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
            fs.writeFileSync(fileFullPath, payload, { mode: 0o600 });

        } catch (error) {
            this._logWarn("Error while saving data to disk: " + Util.dumpObj(error));
            this._onErrorHelper(error);
        }
    }

    /**
     * Check for temp telemetry files
     * reads the first file if exist, deletes it and tries to send its load
     */
    private async _sendFirstFileOnDisk(): Promise<void> {
        try {
            let files = await FileSystemHelper.readdirAsync(this._tempDir);
            files = files.filter(f => path.basename(f).indexOf(".ai.json") > -1);
            if (files.length > 0) {
                var firstFile = files[0];
                var filePath = path.join(this._tempDir, firstFile);
                let buffer = await FileSystemHelper.readFileAsync(filePath);
                // delete the file first to prevent double sending
                await FileSystemHelper.unlinkAsync(filePath);
                let envelopes: Contracts.EnvelopeTelemetry[] = JSON.parse(buffer.toString());
                await this.send(envelopes);
            }
        }
        catch (err) {
            this._onErrorHelper(err);
        }
    }

    private _onErrorHelper(error: Error): void {
        if (typeof this._onError === "function") {
            this._onError(error);
        }
    }

    private async _fileCleanupTask(): Promise<void> {
        try {
            let files = await FileSystemHelper.readdirAsync(this._tempDir);
            files = files.filter(f => path.basename(f).indexOf(".ai.json") > -1);
            if (files.length > 0) {
                for (let i = 0; i < files.length; i++) {
                    // Check expiration
                    let fileCreationDate: Date = new Date(parseInt(files[i].split(".ai.json")[0]));
                    let expired = new Date(+(new Date()) - Sender.FILE_RETEMPTION_PERIOD) > fileCreationDate;
                    if (expired) {
                        var filePath = path.join(this._tempDir, files[i]);
                        await FileSystemHelper.unlinkAsync(filePath).catch((err) => {
                            this._onErrorHelper(err);
                        });
                    }
                }
            }
        }
        catch (err) {
            if (err.code != "ENOENT") {
                this._onErrorHelper(err);
            }
        }
    }
}

export = Sender;