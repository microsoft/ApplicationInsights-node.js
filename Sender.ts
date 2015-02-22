/**
* Replacement for the browser Sender class
* uses the batching logic in Javascript Sender.send but sends with node http.request
*/

import http = require("http");
import url = require("url");
import os = require('os'); 
import path = require('path');
import fs = require('fs'); 

class Sender {
    
    public static TEMPDIR: string = 'appInsights-node'; 
    
    private _config: Microsoft.ApplicationInsights.ISenderConfig;
    private _onSuccess: (response: string) => void;
    private _onError: (error: Error) => void;
    private _enableCacheOnError: boolean; 

    constructor(config: Microsoft.ApplicationInsights.ISenderConfig, onSuccess?: (response: string) => void, onError?: (error: Error) => void) {
        this._config = config;
        this._onSuccess = onSuccess;
        this._onError = onError;
        this._enableCacheOnError = false;
    }

    public send(payload: Buffer): void
    public send(payload: string): void
    public send(payload: {length: number}) {
        var headers = {
            'Content-Type': 'application/json',
            'Content-Length': payload.length,
        };

        var endpointUrl = this._config.endpointUrl();
        if (endpointUrl && endpointUrl.indexOf("//") === 0) {
            // use https if the config did not specify a protocol
            endpointUrl = "https:" + endpointUrl;
        }

        var options = {
            host: url.parse(endpointUrl).hostname,
            path: url.parse(endpointUrl).pathname,
            method: 'POST',
            headers: headers
        };

        var req = http.request(options, (res: http.ClientResponse) => {
            res.setEncoding('utf-8');

            //returns empty if the data is accepted
            var responseString = '';
            res.on('data', (data: string) => {
                responseString += data;
            });
            res.on('end', () => {
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

        req.on('error', (error: Error) => {
            this._onErrorHelper(error); 

            if (this._enableCacheOnError){
                this._storeToDisk(payload);
            }
        });

        req.write(payload);
        req.end();
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
    private _storeToDisk(payload: any) {
        
        //ensure directory is created
        var direcotry = path.join(os.tmpDir(), Sender.TEMPDIR);
        if (!fs.existsSync(direcotry)) {
            try {
                fs.mkdirSync(direcotry);
            } catch (error) {
                // failing to create the temp direcotry 
                this._onErrorHelper(error);
                return;
            }
        }
        
        //create file - file name for now is the timestamp, a better approach would be a UUID but that
        //would require an external dependency 
        var fileName = new Date().getTime() + '.ai.json';
        var fileFullPath = path.join(direcotry, fileName);
        
        // if the file already exist, replace the content
        fs.writeFile(fileFullPath, payload,(error) => this._onErrorHelper(error));
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
                files = files.filter(f => path.basename(f).indexOf('.ai.json') > -1);
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
