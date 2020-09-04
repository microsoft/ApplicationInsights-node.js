import os = require("os");
import TelemetryClient = require("../Library/TelemetryClient");
import Constants = require("../Declarations/Constants");
import Util = require("../Library/Util");
import Config = require("../Library/Config");
import Context = require("../Library/Context");
import AutoCollectHttpDependencies = require("../AutoCollection/HttpDependencies");

const AIMS_URI = "http://169.254.169.254/metadata/instance/compute";
const AIMS_API_VERSION = "api-version=2017-12-01";
const AIMS_FORMAT = "format=json";
const ConnectionErrorMessage = "ENETUNREACH";

class HeartBeat {

    public static INSTANCE: HeartBeat;

    private _collectionInterval: number = 900000;
    private _client: TelemetryClient;
    private _handle: NodeJS.Timer | null;
    private _isEnabled: boolean;
    private _isInitialized: boolean;
    private _isVM: boolean;
    private _vmData = <{[key: string]: string}>{};
    private _azInst_vmId: string = "";	
    private _azInst_subscriptionId: string = "";	
    private _azInst_osType: string = "";

    constructor(client: TelemetryClient) {
        if (!HeartBeat.INSTANCE) {
            HeartBeat.INSTANCE = this;
        }

        this._isInitialized = false;
        this._client = client;
    }

    public enable(isEnabled: boolean, config?: Config) {
        this._isEnabled = isEnabled;
        if (this._isEnabled && !this._isInitialized) {
            this._isInitialized = true;
        }

        if (isEnabled) {
            if (!this._handle) {
                this._handle = setInterval(() => this.trackHeartBeat(config, () => {}), this._collectionInterval);
                this._handle.unref(); // Allow the app to terminate even while this loop is going on
            }
        } else {
            if (this._handle) {
                clearInterval(this._handle);
                this._handle = null;
            }
        }
    }

    public isInitialized() {
        return this._isInitialized;
    }

    public static isEnabled() {
        return HeartBeat.INSTANCE && HeartBeat.INSTANCE._isEnabled;
    }

    public trackHeartBeat(config: Config, callback: () => void) {
        let waiting: boolean = false;
        let properties: {[key: string]: string} = {};
        const sdkVersion = Context.sdkVersion; // "node" or "node-nativeperf"
        properties["sdk"] = sdkVersion;
        properties["osType"] = os.type();
        if (process.env.WEBSITE_SITE_NAME) { // Web apps
            properties["appSrv_SiteName"] = process.env.WEBSITE_SITE_NAME || "";
            properties["appSrv_wsStamp"] = process.env.WEBSITE_HOME_STAMPNAME || "";
            properties["appSrv_wsHost"] = process.env.WEBSITE_HOSTNAME || "";
        } else if (process.env.FUNCTIONS_WORKER_RUNTIME) { // Function apps
            properties["azfunction_appId"] = process.env.WEBSITE_HOSTNAME;
        } else if (config) {
            if (this._isVM === undefined) {
                waiting = true;
                this._getAzureComputeMetadata(config, () => {
                    if (this._isVM && Object.keys(this._vmData).length > 0) { // VM
                        properties["azInst_vmId"] = this._vmData["vmId"] || "";
                        properties["azInst_subscriptionId"] = this._vmData["subscriptionId"] || "";
                        properties["azInst_osType"] = this._vmData["osType"] || "";
                        this._azInst_vmId = this._vmData["vmId"] || "";
                        this._azInst_subscriptionId = this._vmData["subscriptionId"] || "";
                        this._azInst_osType = this._vmData["osType"] || "";
                    }
                    this._client.trackMetric({name: Constants.HeartBeatMetricName, value: 0, properties: properties});
                    callback();
                });
            } else if (this._isVM) {
                properties["azInst_vmId"] = this._azInst_vmId;	
                properties["azInst_subscriptionId"] = this._azInst_subscriptionId;	
                properties["azInst_osType"] = this._azInst_osType;
            }
        }
        if (!waiting) {
            this._client.trackMetric({name: Constants.HeartBeatMetricName, value: 0, properties: properties});
            callback();
        }
    }

    public dispose() {
        HeartBeat.INSTANCE = null;
        this.enable(false);
        this._isInitialized = false;
    }

    private _getAzureComputeMetadata(config: Config, callback: () => void) {
        const metadataRequestUrl = `${AIMS_URI}?${AIMS_API_VERSION}&${AIMS_FORMAT}`;
        const requestOptions = {
            method: 'GET',
            [AutoCollectHttpDependencies.disableCollectionRequestOption]: true,
            headers: {
                "Metadata": "True",
            }
        };

        const req = Util.makeRequest(config, metadataRequestUrl, requestOptions, (res) => {
            if (res.statusCode === 200) {
                // Success; VM
                this._isVM = true;
                let virtualMachineData = "";
                res.on('data', (data: any) => {
                    virtualMachineData += data;
                });
                res.on('end', () => {
                    this._vmData = this._isJSON(virtualMachineData) ? JSON.parse(virtualMachineData) : {};
                    callback();
                });
            } else {
                // else Retry on next heartbeat metrics call
                callback();
            }
        });
        if (req) {
            req.on('error', (error: Error) => {
                // Unable to contact endpoint.
                // Do nothing for now.
                if (error && error.message && error.message.indexOf(ConnectionErrorMessage) > -1) {
                    this._isVM = false; // confirm it's not in VM
                }
                // errors other than connect ENETUNREACH - retry
                callback();
            });
            req.end();
        }
    }

    private _isJSON(str: string): boolean {
        try {
            return (JSON.parse(str) && !!str);
        } catch (e) {
            return false;
        }
    }
}

export = HeartBeat;
