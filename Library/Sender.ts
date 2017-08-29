import fs = require("fs");
import http = require("http");
import https = require("https");
import os = require("os");
import path = require("path");
import url = require("url");
import zlib = require("zlib");

import Logging = require("./Logging");
import Config = require("./Config")
import AutoCollectHttpDependencies = require("../AutoCollection/HttpDependencies");

class Sender {
    private static TAG = "Sender";
    // the amount of time the SDK will wait between resending cached data, this buffer is to avoid any throtelling from the service side
    public static WAIT_BETWEEN_RESEND = 60 * 1000;
    public static TEMPDIR_PREFIX: string = "appInsights-node";

    private _config: Config;
    private _storageDirectory: string;
    private _onSuccess: (response: string) => void;
    private _onError: (error: Error) => void;
    private _enableOfflineMode: boolean;
    protected _resendInterval: number;

    constructor(config: Config, onSuccess?: (response: string) => void, onError?: (error: Error) => void) {
        this._config = config;
        this._onSuccess = onSuccess;
        this._onError = onError;
        this._enableOfflineMode = false;
        this._resendInterval = Sender.WAIT_BETWEEN_RESEND;
    }

    /**
    * Enable or disable offline mode
    */
    public setOfflineMode(value: boolean, resendInterval?: number) {
        this._enableOfflineMode = value;
        if (typeof resendInterval === 'number' && resendInterval >= 0) {
            this._resendInterval = Math.floor(resendInterval);
        }
    }

    public send(payload: Buffer, callback?: (v: string) => void) {
        var endpointUrl = this._config.endpointUrl;
        if (endpointUrl && endpointUrl.indexOf("//") === 0) {
            // use https if the config did not specify a protocol
            endpointUrl = "https:" + endpointUrl;
        }

        // todo: investigate specifying an agent here: https://nodejs.org/api/http.html#http_class_http_agent
        var parsedUrl = url.parse(endpointUrl);
        var options = {
            host: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname,
            method: "POST",
            withCredentials: false,
            headers: <{ [key: string]: string }>{
                "Content-Type": "application/x-json-stream"
            }
        };

        zlib.gzip(payload, (err, buffer) => {
            var dataToSend = buffer;
            if (err) {
                Logging.warn(err);
                dataToSend = payload; // something went wrong so send without gzip
                options.headers["Content-Length"] = payload.length.toString();
            } else {
                options.headers["Content-Encoding"] = "gzip";
                options.headers["Content-Length"] = buffer.length;
            }

            Logging.info(Sender.TAG, options);

            // Ensure this request is not captured by auto-collection.
            (<any>options)[AutoCollectHttpDependencies.disableCollectionRequestOption] = true;

            var requestCallback = (res: http.ClientResponse) => {
                res.setEncoding("utf-8");

                //returns empty if the data is accepted
                var responseString = "";
                res.on("data", (data: string) => {
                    responseString += data;
                });

                res.on("end", () => {
                    Logging.info(Sender.TAG, responseString);
                    if (typeof this._onSuccess === "function") {
                        this._onSuccess(responseString);
                    }

                    if (typeof callback === "function") {
                        callback(responseString);
                    }

                    if (this._enableOfflineMode) {
                        // try to send any cached events if the user is back online
                        if (res.statusCode === 200) {
                            setTimeout(() => this._sendFirstFileOnDisk(), this._resendInterval);
                            // store to disk in case of burst throttling
                        } else if (res.statusCode === 206 ||
                            res.statusCode === 429 ||
                            res.statusCode === 439) {
                            this._storeToDisk(payload);
                        }
                    }
                });
            };

            var req = (parsedUrl.protocol == "https:") ?
                https.request(<any>options, requestCallback) :
                http.request(<any>options, requestCallback);

            req.on("error", (error: Error) => {
                // todo: handle error codes better (group to recoverable/non-recoverable and persist)
                Logging.warn(Sender.TAG, error);
                this._onErrorHelper(error);

                if (typeof callback === "function") {
                    var errorMessage = "error sending telemetry";
                    if (error && (typeof error.toString === "function")) {
                        errorMessage = error.toString();
                    }

                    callback(errorMessage);
                }

                if (this._enableOfflineMode) {
                    this._storeToDisk(payload);
                }
            });

            req.write(dataToSend);
            req.end();
        });
    }

    public saveOnCrash(payload: string) {
        if (this._enableOfflineMode) {
            this._storeToDiskSync(payload);
        }
    }

    private _confirmDirExists(directory: string, callback: (err: NodeJS.ErrnoException) => void): void {
        fs.exists(directory, (exists) => {
            if (!exists) {
                fs.mkdir(directory, (err) => {
                    callback(err);
                });
            } else {
                callback(null);
            }
        });
    }

    /**
     * Stores the payload as a json file on disk in the temp directory
     */
    private _storeToDisk(payload: any) {

        //ensure directory is created
        var directory = path.join(os.tmpdir(), Sender.TEMPDIR_PREFIX + this._config.instrumentationKey);

        this._confirmDirExists(directory, (error) => {
            if (error) {
                this._onErrorHelper(error);
                return;
            }

            //create file - file name for now is the timestamp, a better approach would be a UUID but that
            //would require an external dependency
            var fileName = new Date().getTime() + ".ai.json";
            var fileFullPath = path.join(directory, fileName);

            Logging.info(Sender.TAG, "saving data to disk at: " + fileFullPath);
            fs.writeFile(fileFullPath, payload, (error) => this._onErrorHelper(error));
        });
    }

    /**
     * Stores the payload as a json file on disk using sync file operations
     * this is used when storing data before crashes
     */
    private _storeToDiskSync(payload: any) {
        var directory = path.join(os.tmpdir(), Sender.TEMPDIR_PREFIX + this._config.instrumentationKey);

        try {
            if (!fs.existsSync(directory)) {
                fs.mkdirSync(directory);
            }

            //create file - file name for now is the timestamp, a better approach would be a UUID but that
            //would require an external dependency
            var fileName = new Date().getTime() + ".ai.json";
            var fileFullPath = path.join(directory, fileName);

            Logging.info(Sender.TAG, "saving data before crash to disk at: " + fileFullPath);
            fs.writeFileSync(fileFullPath, payload);

        } catch (error) {
            this._onErrorHelper(error);
        }
    }

    /**
     * Check for temp telemetry files
     * reads the first file if exist, deletes it and tries to send its load
     */
    private _sendFirstFileOnDisk(): void {
        var tempDir = path.join(os.tmpdir(), Sender.TEMPDIR_PREFIX + this._config.instrumentationKey);

        fs.exists(tempDir, (exists: boolean) => {
            if (exists) {
                fs.readdir(tempDir, (error, files) => {
                    if (!error) {
                        files = files.filter(f => path.basename(f).indexOf(".ai.json") > -1);
                        if (files.length > 0) {
                            var firstFile = files[0];
                            var filePath = path.join(tempDir, firstFile);
                            fs.readFile(filePath, (error, payload) => {
                                if (!error) {
                                    // delete the file first to prevent double sending
                                    fs.unlink(filePath, (error) => {
                                        if (!error) {
                                            this.send(payload);
                                        } else {
                                            this._onErrorHelper(error);
                                        }
                                    });
                                } else {
                                    this._onErrorHelper(error);
                                }
                            });
                        }
                    } else {
                        this._onErrorHelper(error);
                    }
                });
            }
        });
    }

    private _onErrorHelper(error: Error): void {
        if (typeof this._onError === "function") {
            this._onError(error);
        }
    }
}

export = Sender;
