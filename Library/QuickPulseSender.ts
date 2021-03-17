import https = require("https");
import Config = require("./Config");
import AutoCollectHttpDependencies = require("../AutoCollection/HttpDependencies");
import Logging = require("./Logging");
import QuickPulseUtil = require("./QuickPulseUtil");
import Util = require("./Util");

// Types
import * as http from "http";
import * as Contracts from "../Declarations/Contracts";

const QuickPulseConfig = {
    method: "POST",
    time: "x-ms-qps-transmission-time",
    pollingIntervalHint: "x-ms-qps-service-polling-interval-hint",
    endpointRedirect: "x-ms-qps-service-endpoint-redirect",
    instanceName: "x-ms-qps-instance-name",
    streamId: "x-ms-qps-stream-id",
    machineName: "x-ms-qps-machine-name",
    roleName: "x-ms-qps-role-name",
    streamid: "x-ms-qps-stream-id",
    invariantVersion: "x-ms-qps-invariant-version",
    subscribed: "x-ms-qps-subscribed"
};

class QuickPulseSender {
    private static TAG = "QuickPulseSender";
    private static MAX_QPS_FAILURES_BEFORE_WARN = 25;

    private _config: Config;
    private _consecutiveErrors: number;

    constructor(config: Config) {
        this._config = config;
        this._consecutiveErrors = 0;
    }

    public ping(envelope: Contracts.EnvelopeQuickPulse, 
            redirectedHostEndpoint: string,
            done: (shouldPOST?: boolean, res?: http.IncomingMessage, redirectedHost?: string, pollingIntervalHint?: number) => void,
        ): void {
        
        let pingHeaders: { name: string, value: string }[] = [
            { name: QuickPulseConfig.streamId, value: envelope.StreamId },
            { name: QuickPulseConfig.machineName, value: envelope.MachineName },
            { name: QuickPulseConfig.roleName, value: envelope.RoleName },
            { name: QuickPulseConfig.instanceName, value: envelope.Instance },
            { name: QuickPulseConfig.invariantVersion, value: envelope.InvariantVersion.toString() }
        ];
        this._submitData(envelope, redirectedHostEndpoint, done, "ping", pingHeaders);
    }

    public post(envelope: Contracts.EnvelopeQuickPulse, 
            redirectedHostEndpoint: string,
            done: (shouldPOST?: boolean, res?: http.IncomingMessage, redirectedHost?: string, pollingIntervalHint?: number) => void,
        ): void {

        // Important: When POSTing data, envelope must be an array
        this._submitData([envelope], redirectedHostEndpoint, done, "post");
    }

    private _submitData(envelope: Contracts.EnvelopeQuickPulse | Contracts.EnvelopeQuickPulse[], 
            redirectedHostEndpoint: string,
            done: (shouldPOST?: boolean, res?: http.IncomingMessage, redirectedHost?: string, pollingIntervalHint?: number) => void, 
            postOrPing: "post" | "ping", 
            additionalHeaders?: { name: string, value: string }[]
        ): void {

        const payload = JSON.stringify(envelope);
        var options = {
            [AutoCollectHttpDependencies.disableCollectionRequestOption]: true,
            host: (redirectedHostEndpoint && redirectedHostEndpoint.length > 0) ? redirectedHostEndpoint : this._config.quickPulseHost,
            method: QuickPulseConfig.method,
            path: `/QuickPulseService.svc/${postOrPing}?ikey=${this._config.instrumentationKey}`,
            headers:{
                'Expect': '100-continue',
                [QuickPulseConfig.time]: QuickPulseUtil.getTransmissionTime(), // unit = 100s of nanoseconds
                'Content-Type': 'application\/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        if (additionalHeaders && additionalHeaders.length > 0) {
            additionalHeaders.forEach(header => options.headers[header.name] = header.value);
        }

        // HTTPS only
        if (this._config.httpsAgent) {
            (<any>options).agent = this._config.httpsAgent;
        } else {
            (<any>options).agent = Util.tlsRestrictedAgent;
        }

        const req = https.request(options, (res: http.IncomingMessage) => {
            const shouldPOSTData = res.headers[QuickPulseConfig.subscribed] === "true";
            const redirectHeader = res.headers[QuickPulseConfig.endpointRedirect];
            const pollingIntervalHint = res.headers[QuickPulseConfig.pollingIntervalHint] as number;
            this._consecutiveErrors = 0;
            done(shouldPOSTData, res, redirectHeader, pollingIntervalHint);
        });
        req.on("error", (error: Error) => {
            // Unable to contact qps endpoint.
            // Do nothing for now.
            this._consecutiveErrors++;

            // LOG every error, but WARN instead when X number of consecutive errors occur
            let notice = `Transient error connecting to the Live Metrics endpoint. This packet will not appear in your Live Metrics Stream. Error:`;
            if (this._consecutiveErrors % QuickPulseSender.MAX_QPS_FAILURES_BEFORE_WARN === 0) {
                notice = `Live Metrics endpoint could not be reached ${this._consecutiveErrors} consecutive times. Most recent error:`;
                Logging.warn(QuickPulseSender.TAG, notice, error);
            } else {
                // Potentially transient error, do not change the ping/post state yet.
                Logging.info(QuickPulseSender.TAG, notice, error);
            }

            done();
        });

        req.write(payload);
        req.end();
    }
}

export = QuickPulseSender;
