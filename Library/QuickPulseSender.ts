import https = require("https");
import Config = require("./Config");
import AutoCollectHttpDependencies = require("../AutoCollection/HttpDependencies");
import Logging = require("./Logging");

// Types
import * as http from "http";
import * as Contracts from "../Declarations/Contracts";

const QuickPulseConfig = {
    method: "POST",
    time: "x-ms-qps-transmission-time",
    subscribed: "x-ms-qps-subscribed"
};

class QuickPulseSender {
    private _config: Config;

    constructor(config: Config) {
        this._config = config;
    }

    public ping(envelope: Contracts.EnvelopeQuickPulse, done: (shouldPOST: boolean) => void): void {
        this._submitData(envelope, done, "ping");
    }

    public post(envelope: Contracts.EnvelopeQuickPulse, done: (shouldPOST: boolean, res: http.IncomingMessage) => void): void {

        // Important: When POSTing data, envelope must be an array
        this._submitData([envelope], done, "post");
    }

    private _submitData(envelope: Contracts.EnvelopeQuickPulse | Contracts.EnvelopeQuickPulse[], done: (shouldPOST: boolean, res: http.IncomingMessage) => void, postOrPing: "post" | "ping"): void {
        const payload = JSON.stringify(envelope);
        var options = {
            [AutoCollectHttpDependencies.disableCollectionRequestOption]: true,
            host: this._config.quickPulseHost,
            method: QuickPulseConfig.method,
            path: `/QuickPulseService.svc/${postOrPing}?ikey=${this._config.instrumentationKey}`,
            headers:{
                'Expect': '100-continue',
                [QuickPulseConfig.time]: 10000 * Date.now(), // unit = 100s of nanoseconds
                'Content-Type': 'application\/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res: http.IncomingMessage) => {
            const shouldPOSTData = res.headers[QuickPulseConfig.subscribed] === "true";
            done(shouldPOSTData, res);
        });
        req.on("error", (error: Error) => {
            // Unable to contact qps endpoint.
            // Do nothing for now.
            Logging.warn("Unable to contact qps endpoint", error);
        });

        req.write(payload);
        req.end();
    }
}

export = QuickPulseSender;
