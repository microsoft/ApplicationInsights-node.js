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
    // the amount of time the SDK will wait between resending cached data, this buffer is to avoid any throtelling from the service side
    public static WAIT_BETWEEN_RESEND = 60 * 1000; 
    public static TEMPDIR: string = "appInsights-node";
    
    private _getUrl: () => string;
    private _onSuccess: (response: string) => void;
    private _onError: (error: Error) => void;
    private _enableOfflineMode: boolean; 

    constructor(getUrl: () => string, onSuccess?: (response: string) => void, onError?: (error: Error) => void) {
        this._getUrl = getUrl;
        this._onSuccess = onSuccess;
        this._onError = onError;
        this._enableOfflineMode = false;
    }
    
    /**
    * Enable or disable offline mode
    */
    public setOfflineMode(value: boolean) {
        this._enableOfflineMode = value;
    }

    public send(payload: Buffer, callback?: (string) => void) {
        var endpointUrl = this._getUrl();
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

                    if (typeof callback === "function") {
                        callback(responseString);
                    }

                    if (this._enableOfflineMode) {
                        // try to send any cached events if the user is back online
                        if (res.statusCode === 200) {
                            setTimeout(() => this._sendFirstFileOnDisk(), Sender.WAIT_BETWEEN_RESEND); 
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
        this._storeToDiskSync(payload);
    }
    
    private _confirmDirExists(direcotry: string, callback: (err) => void): void {
        fs.exists(direcotry, (exists) => {
            if (!exists) {
               fs.mkdir(direcotry, (err) => {
                   callback(err);
               });
            } else {
                callback(null);
            }
        });
    }
    
    /**
     * Stores the payload as a json file on disk in the temp direcotry
     */
    private _storeToDisk(payload: any) {

        //ensure directory is created
        var direcotry = path.join(os.tmpDir(), Sender.TEMPDIR);
        
        this._confirmDirExists(direcotry, (error) => {
            if (error) {
                this._onErrorHelper(error);
                return;
            }
            
            //create file - file name for now is the timestamp, a better approach would be a UUID but that
            //would require an external dependency 
            var fileName = new Date().getTime() + ".ai.json";
            var fileFullPath = path.join(direcotry, fileName);
            
            Logging.info(Sender.TAG, "saving data to disk at: " + fileFullPath);
            fs.writeFile(fileFullPath, payload, (error) => this._onErrorHelper(error));
        }); 
    }
    
    /**
     * Stores the payload as a json file on disk using sync file operations 
     * this is used when storing data before crashes
     */
    private _storeToDiskSync(payload: any) {
        var direcotry = path.join(os.tmpDir(), Sender.TEMPDIR);

        try {
            if (!fs.existsSync(direcotry)) {
                fs.mkdirSync(direcotry);
            }
            
            //create file - file name for now is the timestamp, a better approach would be a UUID but that
            //would require an external dependency 
            var fileName = new Date().getTime() + ".ai.json";
            var fileFullPath = path.join(direcotry, fileName);

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
        var tempDir = path.join(os.tmpDir(), Sender.TEMPDIR);
        
        fs.exists(tempDir, (exists: boolean)=> {
            if (exists) {
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
        });
    }

    private _onErrorHelper(error: Error): void {
        if (typeof this._onError === "function") {
            this._onError(error);
        }
    }
}

export = Sender;
