var http = require("http");
var url = require("url");
/**
* Replacement for Javascripts Sender class
* uses the batching logic in Javascript Sender.send
* replaces Sender.sender with http requests to the endpoint
*/
class Sender {
    public static sender(payload: string, config) {
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

        var req = http.request(options, (res) => {
            res.setEncoding('utf-8');

            //returns empty if the data is accepted
            var responseString = '';
            res.on('data', (data) => {
                responseString += data;
            });
            res.on('end', () => {
            });
        });

        req.write(payload);
        req.end();
    }
}

module.exports = Sender;