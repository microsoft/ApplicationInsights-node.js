import https = require("https");
import Logging = require("./Logging");
import Config = require("./Config");
import AutoCollectHttpDependencies = require("../AutoCollection/HttpDependencies");

class QuickPulseSender {
    private _config: Config;

    constructor(config: Config) {
        this._config = config;
    }

    public ping(envelope: any, done: (shouldPOST: boolean) => void): void {
        this._submitData(envelope, done, "ping");
    }

    public post(envelope: any, done: (shouldPOST: boolean) => void): void {
        Logging.info("Posted data", JSON.stringify(envelope));
        this._submitData([envelope], done, "post");
    }

    private _submitData(envelope: any, done: (shouldPOST: boolean) => void, postOrPing: "post" | "ping"): void {
        const payload = JSON.stringify(envelope);
        var options = {
            [AutoCollectHttpDependencies.disableCollectionRequestOption]: true,
            host: "rt.services.visualstudio.com",
            method: "POST",
            path: `/QuickPulseService.svc/${postOrPing}?ikey=${this._config.instrumentationKey}`,
            headers:{
                'Expect': '100-continue',
                'x-ms-qps-transmission-time': 10000*(Date.now() + 1970*365*24*60*60*1000 + 114*24*60*60*1000),
                'Content-Type': 'application\/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, res => {
            const shouldPOSTData = res.headers["x-ms-qps-subscribed"] === "true";
            done(shouldPOSTData);
        });

        req.write(payload);
        req.end();
    }
}

export = QuickPulseSender;
