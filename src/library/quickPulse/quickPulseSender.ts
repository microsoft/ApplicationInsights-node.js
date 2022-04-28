import * as https from "https";
import * as http from "http";

import * as Contracts from "../../declarations/contracts";
import { AuthorizationHandler } from "./authorizationHandler";
import { Config } from "../configuration";
import { Logger } from "../logging";
import { getTransmissionTime } from "./quickPulseUtil";
import { Util } from "../util";

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
    subscribed: "x-ms-qps-subscribed",
};

export class QuickPulseSender {
    private _TAG = "QuickPulseSender";
    private MAX_QPS_FAILURES_BEFORE_WARN = 25;
    private _config: Config;
    private _authHandler: AuthorizationHandler;
    private _consecutiveErrors: number;

    constructor(
        config: Config,
        getAuthorizationHandler?: (config: Config) => AuthorizationHandler
    ) {
        this._config = config;
        this._consecutiveErrors = 0;
        if (config.aadTokenCredential) {
            this._authHandler = new AuthorizationHandler(config.aadTokenCredential);
        }
    }

    public ping(
        envelope: Contracts.EnvelopeQuickPulse,
        redirectedHostEndpoint: string,
        done: (
            shouldPOST?: boolean,
            res?: http.IncomingMessage,
            redirectedHost?: string,
            pollingIntervalHint?: number
        ) => void
    ): void {
        let pingHeaders: { name: string; value: string }[] = [
            { name: QuickPulseConfig.streamId, value: envelope.StreamId },
            { name: QuickPulseConfig.machineName, value: envelope.MachineName },
            { name: QuickPulseConfig.roleName, value: envelope.RoleName },
            { name: QuickPulseConfig.instanceName, value: envelope.Instance },
            {
                name: QuickPulseConfig.invariantVersion,
                value: envelope.InvariantVersion.toString(),
            },
        ];
        this._submitData(envelope, redirectedHostEndpoint, done, "ping", pingHeaders);
    }

    public async post(
        envelope: Contracts.EnvelopeQuickPulse,
        redirectedHostEndpoint: string,
        done: (
            shouldPOST?: boolean,
            res?: http.IncomingMessage,
            redirectedHost?: string,
            pollingIntervalHint?: number
        ) => void
    ): Promise<void> {
        // Important: When POSTing data, envelope must be an array
        await this._submitData([envelope], redirectedHostEndpoint, done, "post");
    }

    private async _submitData(
        envelope: Contracts.EnvelopeQuickPulse | Contracts.EnvelopeQuickPulse[],
        redirectedHostEndpoint: string,
        done: (
            shouldPOST?: boolean,
            res?: http.IncomingMessage,
            redirectedHost?: string,
            pollingIntervalHint?: number
        ) => void,
        postOrPing: "post" | "ping",
        additionalHeaders?: { name: string; value: string }[]
    ): Promise<void> {
        const payload = Util.getInstance().stringify(envelope);
        var options = {
            // [AutoCollectHttpDependencies.disableCollectionRequestOption]: true,
            // TODO: disable tracking of this HTTP call
            host:
                redirectedHostEndpoint && redirectedHostEndpoint.length > 0
                    ? redirectedHostEndpoint
                    : this._config.quickPulseHost,
            method: QuickPulseConfig.method,
            path: `/QuickPulseService.svc/${postOrPing}?ikey=${this._config.instrumentationKey}`,
            headers: {
                Expect: "100-continue",
                [QuickPulseConfig.time]: getTransmissionTime(), // unit = 100s of nanoseconds
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
            },
        };

        if (additionalHeaders && additionalHeaders.length > 0) {
            additionalHeaders.forEach((header) => (options.headers[header.name] = header.value));
        }

        if (postOrPing === "post") {
            if (this._authHandler) {
                try {
                    // Add bearer token
                    await this._authHandler.addAuthorizationHeader(options);
                } catch (authError) {
                    let notice = "Failed to get AAD bearer token for the Application. Error:";
                    Logger.info(this._TAG, notice, authError);
                    // Do not send request to Quickpulse if auth fails, data will be dropped
                    return;
                }
            }
        }

        // HTTPS only
        if (this._config.httpsAgent) {
            (<any>options).agent = this._config.httpsAgent;
        } else {
            (<any>options).agent = Util.getInstance().tlsRestrictedAgent;
        }

        const req = https.request(options, (res: http.IncomingMessage) => {
            if (res.statusCode == 200) {
                const shouldPOSTData = res.headers[QuickPulseConfig.subscribed] === "true";
                const redirectHeader = res.headers[QuickPulseConfig.endpointRedirect]
                    ? res.headers[QuickPulseConfig.endpointRedirect].toString()
                    : null;
                const pollingIntervalHint = res.headers[QuickPulseConfig.pollingIntervalHint]
                    ? parseInt(res.headers[QuickPulseConfig.pollingIntervalHint].toString())
                    : null;
                this._consecutiveErrors = 0;
                done(shouldPOSTData, res, redirectHeader, pollingIntervalHint);
            } else {
                this._onError(
                    "StatusCode:" + res.statusCode + " StatusMessage:" + res.statusMessage
                );
                done();
            }
        });

        req.on("error", (error: Error) => {
            this._onError(error);
            done();
        });

        req.write(payload);
        req.end();
    }

    private _onError(error: Error | string) {
        // Unable to contact qps endpoint.
        // Do nothing for now.
        this._consecutiveErrors++;
        // LOG every error, but WARN instead when X number of consecutive errors occur
        let notice =
            "Transient error connecting to the Live Metrics endpoint. This packet will not appear in your Live Metrics Stream. Error:";
        if (this._consecutiveErrors % this.MAX_QPS_FAILURES_BEFORE_WARN === 0) {
            notice = `Live Metrics endpoint could not be reached ${this._consecutiveErrors} consecutive times. Most recent error:`;
            Logger.warn(this._TAG, notice, error);
        } else {
            // Potentially transient error, do not change the ping/post state yet.
            Logger.info(this._TAG, notice, error);
        }
    }
}
