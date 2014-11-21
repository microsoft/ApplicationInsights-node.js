/**
* Replacement for the browser Sender class
* uses the batching logic in Javascript Sender.send but sends with node http.request
*/
class Sender {
    private _config: Microsoft.ApplicationInsights.ISenderConfig;
    private _onSuccess: (response: string) => void;
    private _onError: (error: Error) => void;
    private _http;
    private _url;

    constructor(config: Microsoft.ApplicationInsights.ISenderConfig, onSuccess?: (response: string) => void, onError?: (error: Error) => void) {
        this._config = config;
        this._onSuccess = onSuccess;
        this._onError = onError;
        this._http = require("http");
        this._url = require("url");
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
            });
        });

        req.on('error', (error) => {
            if (typeof this._onError === "function") {
                this._onError(error);
            }
        });

        req.write(payload);
        req.end();
    }
}

module.exports = Sender;