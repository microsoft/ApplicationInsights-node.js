// A simple ingestion server to test AI SDK without mocking
var http = require("http");
var zlib = require("zlib");
var Config = require("./Config");
var TestValidation = require("./TestValidation").TestValidation;

var _APPID = "DUMMYAPPID";
var _IKEY = "TESTIKEY";

class Ingestion {
    constructor() {
        var self = this;
        this.telemetry = {};
        this.correlatedTelemetry = {};
        this.telemetryCount = 0;
        this.testValidator = new TestValidation(this);
        this.server = http.createServer(function (request, response) {
            // Handle appid
            if (request.url.indexOf("/api/profiles") > -1) {
                response.end(_APPID);
                return;
            } else if (request.url.indexOf("/v2/track") > -1) {
                var processor = request;
                var data = "";
                if (request.headers["content-encoding"] && request.headers["content-encoding"].toLowerCase() === "gzip") {
                    var gunzip = zlib.createGunzip();
                    request.pipe(gunzip);
                    processor = gunzip;
                }
                processor
                    .on('data', (d)=>data+=d)
                    .on('error', ()=>null)
                    .on('end', (d)=>{
                        data += (d||"");
                        let items = data.split("\n");
                        items.forEach(function(item) {
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