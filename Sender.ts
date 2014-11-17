import http = require("http");
import url = require("url");

/**
* Replacement for Javascripts Sender class
* uses the batching logic in Javascript Sender.send
* replaces Sender.sender with http requests to the endpoint
*/
class Sender {
    public static sender(payload: string, config: Microsoft.ApplicationInsights.ISenderConfig) {
        var headers = {
            'Content-Type': 'application/json',
            'Content-Length': payload.length,
        };

        var endpointUrl = config.endpointUrl();
        if (endpointUrl && endpointUrl.indexOf("//") === 0) {
            // add http protocol if the config did not specify https
            endpointUrl = "http:" + endpointUrl;
        }

        var options = {
            host: url.parse(endpointUrl).hostname,
            path: url.parse(endpointUrl).pathname,
            method: 'POST',
            headers: headers
        };

        var req: http.ClientRequest = http.request(options, (res: http.ClientResponse) => {
            res.setEncoding('utf-8');

            //returns empty if the data is accepted
            var responseString = '';
            res.on('data', (data) => {
                responseString += data;
            });
            res.on('end', () => {
            });
        });

        req.on('error', function (error) {
            console.log('Failed to send telemetry: ' + error.message);
        });

        req.write(payload);
        req.end();
    }
}

module.exports = Sender;