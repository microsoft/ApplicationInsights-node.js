"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureVirtualMachine = void 0;
var Logging = require("./Logging");
var Util = require("./Util");
var AutoCollectHttpDependencies = require("../AutoCollection/HttpDependencies");
var AIMS_URI = "http://169.254.169.254/metadata/instance/compute";
var AIMS_API_VERSION = "api-version=2017-12-01";
var AIMS_FORMAT = "format=json";
var ConnectionErrorMessage = "UNREACH"; // EHOSTUNREACH, ENETUNREACH
var AzureVirtualMachine = /** @class */ (function () {
    function AzureVirtualMachine() {
    }
    AzureVirtualMachine.getAzureComputeMetadata = function (config, callback) {
        var _a;
        var _this = this;
        var vmInfo = {};
        var metadataRequestUrl = AIMS_URI + "?" + AIMS_API_VERSION + "&" + AIMS_FORMAT;
        var requestOptions = (_a = {
                method: "GET"
            },
            _a[AutoCollectHttpDependencies.disableCollectionRequestOption] = true,
            _a.headers = {
                "Metadata": "True"
            },
            _a);
        var req = Util.makeRequest(config, metadataRequestUrl, requestOptions, function (res) {
            if (res.statusCode === 200) {
                // Success; VM
                vmInfo.isVM = true;
                var virtualMachineData_1 = "";
                res.on("data", function (data) {
                    virtualMachineData_1 += data;
                });
                res.on("end", function () {
                    try {
                        var data = JSON.parse(virtualMachineData_1);
                        vmInfo.id = data["vmId"] || "";
                        vmInfo.subscriptionId = data["subscriptionId"] || "";
                        vmInfo.osType = data["osType"] || "";
                    }
                    catch (error) {
                        // Failed to parse JSON
                        Logging.info(AzureVirtualMachine.TAG, error);
                    }
                    callback(vmInfo);
                });
            }
            else {
                callback(vmInfo);
            }
        }, false, false);
        if (req) {
            setTimeout(function () {
                _this._requestTimedOut = true;
                req.abort();
            }, AzureVirtualMachine.HTTP_TIMEOUT);
            req.on("error", function (error) {
                // Unable to contact endpoint.
                // Do nothing for now.
                if (_this._requestTimedOut) {
                    if (error) {
                        error.name = "telemetry timeout";
                        error.message = "telemetry request timed out";
                    }
                }
                if (error && error.message && error.message.indexOf(ConnectionErrorMessage) > -1) {
                    vmInfo.isVM = false; // confirm it's not in VM
                }
                else {
                    // Only log when is not determined if VM or not to avoid noise outside of Azure VMs
                    Logging.info(AzureVirtualMachine.TAG, error);
                }
                callback(vmInfo);
            });
            req.end();
        }
    };
    AzureVirtualMachine.HTTP_TIMEOUT = 2500; // 2.5 seconds
    AzureVirtualMachine.TAG = "AzureVirtualMachine";
    return AzureVirtualMachine;
}());
exports.AzureVirtualMachine = AzureVirtualMachine;
//# sourceMappingURL=AzureVirtualMachine.js.map