// A simple ingestion server to test AI SDK without mocking
var fs = require("fs");
var https = require("https");
var path = require("path");
var zlib = require("zlib");
var Config = require("./config");
var TestValidation = require("./testValidation").TestValidation;

var _IKEY = "TESTIKEY";

class Ingestion {
    constructor() {
        var self = this;
        this.telemetry = {};
        this.correlatedTelemetry = {};
        this.telemetryCount = 0;
        this.testValidator = new TestValidation(this);

        this.server = https.createServer({
            key: fs.readFileSync(
                path.join(__dirname, '../../', 'certs', 'server-key.pem')
            ),
            cert: fs.readFileSync(
                path.join(__dirname, '../../', 'certs', 'server-cert.pem')
            ),
        }, (request, response) => {
            if (request.url.indexOf("/v2.1/track") > -1) {
                var processor = request;
                var data = "";
                if (request.headers["content-encoding"] && request.headers["content-encoding"].toLowerCase() === "gzip") {
                    var gunzip = zlib.createGunzip();
                    request.pipe(gunzip);
                    processor = gunzip;
                }
                processor
                    .on('data', (d) => data += d)
                    .on('error', () => null)
                    .on('end', (d) => {
                        data += (d || "");
                        let items = data.split("\n");
                        items.forEach(function (item) {
                            item = JSON.parse(item);
                            if (!Array.isArray(item)) {
                                item = [item];
                            }
                            item.forEach((subItem) => {
                                self.processItem(subItem);
                            });
                        }, self);
                        response.end(JSON.stringify({
                            itemsRecieved: items.length,
                            itemsAccepted: items.length
                        }));
                    });
            } else if (request.url.indexOf("/") > -1) {
                response.end("OK");
                return;
            } else {
                console.warn("Unexpected ingestion call: " + request.url);
            }
        });
    }

    processItem(item) {
        if (!item || !item.iKey || item.iKey !== _IKEY) {
            console.log("INGESTION: Unexpected ikey or malformed data");
            return;
        }
        var type = "unknown";
        if (item.data && item.data.baseType) {
            type = item.data.baseType;
        }
        if (!this.telemetry[type]) {
            this.telemetry[type] = [];
        }
        this.telemetry[type].push(item);
        if (item.tags && item.tags["ai.operation.id"]) {
            var opId = item.tags["ai.operation.id"];
            if (!this.correlatedTelemetry[opId]) {
                this.correlatedTelemetry[opId] = [];
            }
            this.correlatedTelemetry[opId].push(item);
        }
        this.telemetryCount++;
        // console.log("INGESTION: Recieved item of type: "+ type);
    }

    enable() {
        this.server.listen(parseInt(Config.RunnerPort));
    }

    disable(cb) {
        this.server.close(cb);
    }

    resetTelemetry() {
        this.telemetry = {};
        this.correlatedTelemetry = {};
        this.telemetryCount = 0;
    }
}

module.exports = Ingestion;