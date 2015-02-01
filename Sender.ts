/**
* Replacement for the browser Sender class
* uses the batching logic in Javascript Sender.send but sends with node http.request
*/
class Sender {
    
    public static TEMPDIR: string = 'appInsights-node'; 
    
    private _config: Microsoft.ApplicationInsights.ISenderConfig;
    private _onSuccess: (response: string) => void;
    private _onError: (error: Error) => void;
    private _enableCacheOnError: boolean; 
    private _http;
    private _url;
    private _os; 
    private _path; 
    private _fs; 

    constructor(config: Microsoft.ApplicationInsights.ISenderConfig, onSuccess?: (response: string) => void, onError?: (error: Error) => void) {
        this._config = config;
        this._onSuccess = onSuccess;
        this._onError = onError;
        this._enableCacheOnError = false;
        this._http = require("http");
        this._url = require("url");
        this._os = require('os'); 
        this._path = require('path');
        this._fs = require('fs'); 
    }

    public send(payload: string) {
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
            host: this._url.parse(endpointUrl).hostname,
            path: this._url.parse(endpointUrl).pathname,
            method: 'POST',
            headers: headers
        };

        var req = this._http.request(options, (res) => {
            res.setEncoding('utf-8');

            //returns empty if the data is accepted
            var responseString = '';
            res.on('data', (data) => {
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

        req.on('error', (error) => {
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
    private _storeToDisk(payload: string) {
        
        //ensure directory is created
        var direcotry = this._path.join(this._os.tmpDir(), Sender.TEMPDIR);
        if (!this._fs.existsSync(direcotry)) {
            try {
                this._fs.mkdirSync(direcotry);
            } catch (error) {
                // failing to create the temp direcotry 
                this._onErrorHelper(error);
                return;
            }
        }
        
        //create file - file name for now is the timestamp, a better approach would be a UUID but that
        //would require an external dependency 
        var fileName = new Date().getTime() + '.json';
        var fileFullPath = this._path.join(direcotry, fileName);
        
        // if the file already exist, replace the content
        this._fs.writeFile(fileFullPath, payload,(error) => this._onErrorHelper(error));
    }
    
    /**
     * Check for temp telemetry files
     * reads the first file if exist, deletes it and tries to send its load
     */
    private _sendFirstFileOnDisk(): void {
        var tempDir = this._path.join(this._os.tmpDir(), Sender.TEMPDIR);
        
        if (!this._fs.existsSync(tempDir)) {
            return; 
        }
        
        this._fs.readdir(tempDir,(error, files) => {
            if (!error) {
                if (files.length > 0) {
                    var firstFile = files[0];
                    var filePath = this._path.join(tempDir, firstFile);
                    this._fs.readFile(filePath,(error, payload) => {
                        if (!error) {
                            // delete the file first to prevent double sending
                            this._fs.unlink(filePath,(error) => {
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
