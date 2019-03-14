import https = require("https");
import Config = require("./Config");
import AutoCollectHttpDependencies = require("../AutoCollection/HttpDependencies");

// Types
import * as http from "http";
import * as Contracts from "../Declarations/Contracts";

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
            host: "rt.services.visualstudio.com",
            method: "POST",
            path: `/QuickPulseService.svc/${postOrPing}?ikey=${this._config.instrumentationKey}`,
            headers:{
                'Expect': '100-continue',
                'x-ms-qps-transmission-time': 10000 * Date.now(), // unit = 100s of nanoseconds
                'Content-Type': 'application\/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res: http.IncomingMessage) => {
            const shouldPOSTData = res.headers["x-ms-qps-subscribed"] === "true";
            done(shouldPOSTData, res);
        });

        req.write(payload);
        req.end();
    }
}

export = QuickPulseSender;
