///<reference path="..\Declarations\node\node.d.ts" />

import fs = require("fs");
import http = require("http");
import os = require("os");
import path = require("path");
import url = require("url");
import zlib = require("zlib");

import Logging = require("./Logging");

class Sender {
    private static TAG = "Sender";
    public static TEMPDIR: string = "appInsights-node";

    private _getUrl: () => string;
    private _onSuccess: (response: string) => void;
    private _onError: (error: Error) => void;
    private _enableCacheOnError: boolean; 

    constructor(getUrl: () => string, onSuccess?: (response: string) => void, onError?: (error: Error) => void) {
        this._getUrl = getUrl;
        this._onSuccess = onSuccess;
        this._onError = onError;
        this._enableCacheOnError = false;

        // always begin by trying to send saved data when initialized
        setTimeout(() => this._sendFirstFileOnDisk());
    }

    public send(payload: Buffer) {
        var endpointUrl = this._getUrl();
        if (endpointUrl && endpointUrl.indexOf("//") === 0) {
            // use https if the config did not specify a protocol
            endpointUrl = "https:" + endpointUrl;
        }

        // todo: investigate specifying an agent here: https://nodejs.org/api/http.html#http_class_http_agent
        var options = {
            host: url.parse(endpointUrl).hostname,
            path: url.parse(endpointUrl).pathname,
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        };

        zlib.gzip(payload, (err, buffer) => {
            var dataToSend = buffer;
            if (err) {
                Logging.warn(err);
                dataToSend = payload; // something went wrong so send without gzip
                options.headers["Content-Length"] = payload.length;
            } else {
                options.headers["Content-Encoding"] = "gzip";
                options.headers["Content-Length"] = buffer.length;
            }

            Logging.info(Sender.TAG, options);

            var req = http.request(options, (res:http.ClientResponse) => {
                res.setEncoding("utf-8");

                //returns empty if the data is accepted
                var responseString = "";
                res.on("data", (data:string) => {
                    responseString += data;
                });

                res.on("end", () => {
                    Logging.info(Sender.TAG, responseString);
                    if (typeof this._onSuccess === "function") {
                        this._onSuccess(responseString);
                    }

                    if (this._enableCacheOnError) {
                        // try to send any cached events if the user is back online
                        if (res.statusCode === 200) {
                            this._sendFirstFileOnDisk();
                        } else {
                            // cache the payload to send it later
                            this._storeToDisk(payload);
                        }
                    }
                });
            });

            req.on("error", (error:Error) => {
                // todo: handle error codes better (group to recoverable/non-recoverable and persist)
                Logging.warn(Sender.TAG, error);
                this._onErrorHelper(error);

                if (this._enableCacheOnError) {
                    this._storeToDisk(payload);
                }
            });

            req.write(dataToSend);
            req.end();
        });
    }

    public saveOnCrash(payload: string) {
        this._storeToDisk(payload, true);
    }
    
    /**
     * enable caching events locally on error
     */
    public enableCacheOnError(): void {
        this._enableCacheOnError = true;
    }
    
    /**
    * disable caching events locally on error
    */
    public disableCacheOnError(): void {
        this._enableCacheOnError = false;
    }
    
    /**
     * Stores the payload as a json file on disk in the temp direcotry
     */
    private _storeToDisk(payload: any, isCrash?: boolean) {

        //ensure directory is created
        var direcotry = path.join(os.tmpDir(), Sender.TEMPDIR);
        if (!fs.existsSync(direcotry)) {
            try {
                fs.mkdirSync(direcotry);
            } catch (error) {
                // failing to create the temp directory
                this._onErrorHelper(error);
                return;
            }
        }

        //create file - file name for now is the timestamp, a better approach would be a UUID but that
        //would require an external dependency 
        var fileName = new Date().getTime() + ".ai.json";
        var fileFullPath = path.join(direcotry, fileName);

        // if the file already exist, replace the content
        if (isCrash) {
            Logging.info(Sender.TAG, "saving crash to disk at: " + fileFullPath);
            fs.writeFileSync(fileFullPath, payload);
        } else {
            Logging.info(Sender.TAG, "saving data to disk at: " + fileFullPath);
            fs.writeFile(fileFullPath, payload, (error) => this._onErrorHelper(error));
        }
    }
    
    /**
     * Check for temp telemetry files
     * reads the first file if exist, deletes it and tries to send its load
     */
    private _sendFirstFileOnDisk(): void {
        var tempDir = path.join(os.tmpDir(), Sender.TEMPDIR);
        
        if (!fs.existsSync(tempDir)) {
            return; 
        }
        
        fs.readdir(tempDir,(error, files) => {
            if (!error) {
                files = files.filter(f => path.basename(f).indexOf(".ai.json") > -1);
                if (files.length > 0) {    
                    var firstFile = files[0];
                    var filePath = path.join(tempDir, firstFile);
                    fs.readFile(filePath,(error, payload) => {
                        if (!error) {
                            // delete the file first to prevent double sending
                            fs.unlink(filePath,(error) => {
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

    private _onErrorHelper(error: Error): void {
        if (typeof this._onError === "function") {
            this._onError(error);
        }
    }
}

export = Sender;
