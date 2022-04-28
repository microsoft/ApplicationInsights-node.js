// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import http = require("http");
import zlib = require("zlib");
import { ExportResult, ExportResultCode } from "@opentelemetry/core";

import { Config } from "../../configuration";
import { FileSystemPersist } from "./persist";
import { IPersistentStorage } from "../../../declarations/types";
import * as Constants from "../../../declarations/constants";
import { isRetriable, IBreezeResponse, IBreezeError } from "./breezeUtils";
import { TelemetryItem as Envelope } from "../../../declarations/generated";
import { Util } from "../../util";
import { Logger } from "../../logging";
import { Statsbeat } from "../../statsbeat";
import { AuthorizationHandler } from "../../quickPulse/authorizationHandler";
import { BreezeResponse } from "../../../declarations/contracts";

const legacyThrottleStatusCode = 439; //  - Too many requests and refresh cache
const throttleStatusCode = 402; // Monthly Quota Exceeded (new SDK)
const RESPONSE_CODES_INDICATING_REACHED_BREEZE = [200, 206, 402, 408, 429, 439, 500];

export class BaseExporter {
    private _TAG = "Sender";
    private readonly _persister: IPersistentStorage;
    protected _config: Config;
    private _resendInterval: number;
    private _numConsecutiveRedirects: number;
    private _retryTimer: NodeJS.Timer | null;
    private _authHandler: AuthorizationHandler;
    private _isStatsbeatSender: boolean;
    private _shutdownStatsbeat: () => void;
    private _failedToIngestCounter: number;
    private _numConsecutiveFailures: number;
    private _statsbeatHasReachedIngestionAtLeastOnce: boolean;
    private _statsbeat: Statsbeat;
    private _redirectedHost: string;
    private _onSuccess: (response: string) => void;
    private _onError: (error: Error) => void;


    constructor(config: Config, onSuccess?: (response: string) => void, onError?: (error: Error) => void, statsbeat?: Statsbeat, isStatsbeatSender?: boolean, shutdownStatsbeat?: () => void) {
        this._config = config;
        this._numConsecutiveRedirects = 0;
        this._resendInterval = 60 * 1000; // 1 minute;


        if (this._config.aadTokenCredential) {
            this._authHandler = new AuthorizationHandler(this._config.aadTokenCredential);
        }

        this._onSuccess = onSuccess;
        this._onError = onError;
        this._statsbeat = statsbeat;
        this._isStatsbeatSender = isStatsbeatSender || false;
        this._shutdownStatsbeat = shutdownStatsbeat;
        this._failedToIngestCounter = 0;
        this._numConsecutiveFailures = 0;
        this._numConsecutiveRedirects = 0;
        this._statsbeatHasReachedIngestionAtLeastOnce = false;

        this._persister = new FileSystemPersist(this._config);
        this._retryTimer = null;
    }

    protected async _exportEnvelopes(envelopes: Envelope[]): Promise<ExportResult> {
        this._logInfo(`Exporting ${envelopes.length} envelope(s)`);
        await this._send(envelopes);
    }

    /**
     * Shutdown
     */
    public async shutdown(): Promise<void> {
        this._logInfo("Exporter shutting down");
        // TODO: Ensure HTTP requests are completed
    }

    public async persistOnCrash(envelopes: Envelope[]): Promise<string> {
        try {
            this._persist(envelopes);
        } catch (ex) {
            return "Failed to persist envelopes";
        }
    }

    private async _send(envelopes: Envelope[], callback?: (v: string) => void) {
        if (envelopes) {
            var endpointUrl = this._redirectedHost || this._config.endpointUrl;

            var endpointHost = new URL(endpointUrl).hostname;

            // todo: investigate specifying an agent here: https://nodejs.org/api/http.html#http_class_http_agent
            var options = {
                method: "POST",
                withCredentials: false,
                headers: <{ [key: string]: string }>{
                    "Content-Type": "application/x-json-stream"
                }
            };

            if (this._authHandler) {
                if (this._statsbeat) {
                    this._statsbeat.addFeature(Constants.StatsbeatFeature.AAD_HANDLING);
                }
                try {
                    // Add bearer token
                    await this._authHandler.addAuthorizationHeader(options);
                }
                catch (authError) {
                    let errorMsg = "Failed to get AAD bearer token for the Application.";
                    this._persist(envelopes);
                    errorMsg += "Error:" + authError.toString();
                    this._logWarn(errorMsg);

                    if (typeof callback === "function") {
                        callback(errorMsg);
                    }
                    return; // If AAD auth fails do not send to Breeze
                }
            }

            let batch: string = "";
            envelopes.forEach(envelope => {
                var payload: string = Util.getInstance().stringify(envelope);
                if (typeof payload !== "string") {
                    return;
                }
                batch += payload + "\n";
            });
            // Remove last \n
            if (batch.length > 0) {
                batch = batch.substring(0, batch.length - 1);
            }

            let payload: Buffer = Buffer.from ? Buffer.from(batch) : new Buffer(batch);

            // TODO: zlib is not supported in Azure Monitor Exporter
            zlib.gzip(payload, (err, buffer) => {
                var dataToSend = buffer;
                if (err) {
                    this._logWarn(Util.getInstance().dumpObj(err));
                    dataToSend = payload; // something went wrong so send without gzip
                    options.headers["Content-Length"] = payload.length.toString();
                } else {
                    options.headers["Content-Encoding"] = "gzip";
                    options.headers["Content-Length"] = buffer.length.toString();
                }

                this._logInfo(Util.getInstance().dumpObj(options));

                // Ensure this request is not captured by auto-collection.
                // (<any>options)[AutoCollectHttpDependencies.disableCollectionRequestOption] = true;
                // TODO: Update usign OpenTelemetry format

                let startTime = +new Date();

                var requestCallback = (res: http.ClientResponse) => {
                    res.setEncoding("utf-8");

                    //returns empty if the data is accepted
                    var responseString = "";
                    res.on("data", (data: string) => {
                        responseString += data;
                    });

                    res.on("end", () => {
                        let endTime = +new Date();
                        let duration = endTime - startTime;
                        this._numConsecutiveFailures = 0;
                        // Handling of Statsbeat instance sending data, should turn it off if is not able to reach ingestion endpoint
                        if (this._isStatsbeatSender && !this._statsbeatHasReachedIngestionAtLeastOnce) {
                            if (RESPONSE_CODES_INDICATING_REACHED_BREEZE.includes(res.statusCode)) {
                                this._statsbeatHasReachedIngestionAtLeastOnce = true;
                            }
                            else {
                                this._statsbeatFailedToIngest();
                            }
                        }
                        if (this._statsbeat) {
                            if (res.statusCode == throttleStatusCode || res.statusCode == legacyThrottleStatusCode) { // Throttle
                                this._statsbeat.countThrottle(Constants.StatsbeatNetworkCategory.Breeze, endpointHost);
                            }
                            else {
                                this._statsbeat.countRequest(Constants.StatsbeatNetworkCategory.Breeze, endpointHost, duration, res.statusCode === 200);
                            }
                        }

                        // try to send any cached events if the user is back online
                        if (res.statusCode === 200) {
                            if (!this._retryTimer) {
                                this._retryTimer = setTimeout(() => {
                                    this._retryTimer = null;
                                    this._sendFirstPersistedFile()
                                }, this._resendInterval);
                                this._retryTimer.unref();
                            }

                        } else if (isRetriable(res.statusCode)) {
                            try {
                                if (this._statsbeat) {
                                    this._statsbeat.countRetry(Constants.StatsbeatNetworkCategory.Breeze, endpointHost);
                                }
                                const breezeResponse = JSON.parse(responseString) as BreezeResponse;
                                let filteredEnvelopes: Envelope[] = [];
                                if (breezeResponse.errors) {
                                    breezeResponse.errors.forEach(error => {
                                        if (isRetriable(error.statusCode)) {
                                            filteredEnvelopes.push(envelopes[error.index]);
                                        }
                                    });
                                    if (filteredEnvelopes.length > 0) {
                                        this._persist(filteredEnvelopes);
                                    }
                                }

                            }
                            catch (ex) {
                                this._persist(envelopes); // Retriable status code with not valid Breeze response
                            }
                        }
                        // Redirect handling
                        if (res.statusCode === 307 || // Temporary Redirect
                            res.statusCode === 308) { // Permanent Redirect
                            this._numConsecutiveRedirects++;
                            // To prevent circular redirects
                            if (this._numConsecutiveRedirects < 10) {
                                // Try to get redirect header
                                const locationHeader = res.headers["location"] ? res.headers["location"].toString() : null;
                                if (locationHeader) {
                                    this._redirectedHost = locationHeader;
                                    // Send to redirect endpoint as HTTPs library doesn't handle redirect automatically
                                    this._send(envelopes, callback);
                                }
                            }
                            else {
                                if (this._statsbeat) {
                                    this._statsbeat.countException(Constants.StatsbeatNetworkCategory.Breeze, endpointHost);
                                }
                                if (typeof callback === "function") {
                                    callback("Error sending telemetry because of circular redirects.");
                                }
                            }

                        }
                        else {
                            this._numConsecutiveRedirects = 0;
                            if (typeof callback === "function") {
                                callback(responseString);
                            }
                            this._logInfo(responseString);
                            if (typeof this._onSuccess === "function") {
                                this._onSuccess(responseString);
                            }
                        }
                    });
                };

                var req = Util.getInstance().makeRequest(this._config, endpointUrl, options, requestCallback);

                req.on("error", (error: Error) => {
                    if (this._isStatsbeatSender && !this._statsbeatHasReachedIngestionAtLeastOnce) {
                        this._statsbeatFailedToIngest();
                    }
                    // todo: handle error codes better (group to recoverable/non-recoverable and persist)
                    this._numConsecutiveFailures++;
                    if (this._statsbeat) {
                        this._statsbeat.countException(Constants.StatsbeatNetworkCategory.Breeze, endpointHost);
                    }

                    let notice = "Failure to reach ingestion endpoint.";
                    this._logWarn(notice, Util.getInstance().dumpObj(error));
                    if (this._onError) {
                        this._onError(error);
                    }

                    if (typeof callback === "function") {
                        if (error) {
                            callback(Util.getInstance().dumpObj(error));
                        }
                        else {
                            callback("Error sending telemetry");
                        }
                    }

                    this._persist(envelopes);
                });

                req.write(dataToSend);
                req.end();
            });
        }
    }

    private _logInfo(message?: any, ...optionalParams: any[]) {
        if (!this._isStatsbeatSender) {
            Logger.info(this._TAG, message, optionalParams);
        }
    }

    private _logWarn(message?: any, ...optionalParams: any[]) {
        if (!this._isStatsbeatSender) {
            Logger.warn(this._TAG, message, optionalParams);
        }
    }

    private async _persist(envelopes: Envelope[]): Promise<ExportResult> {
        try {
            const success = await this._persister.push(envelopes);
            return success
                ? { code: ExportResultCode.SUCCESS }
                : {
                    code: ExportResultCode.FAILED,
                    error: new Error("Failed to persist envelope in disk."),
                };
        } catch (ex) {
            return { code: ExportResultCode.FAILED, error: ex };
        }
    }

    private async _sendFirstPersistedFile(): Promise<void> {
        try {
            const envelopes = (await this._persister.shift()) as Envelope[] | null;
            if (envelopes) {
                await this._send(envelopes);
            }
        } catch (err) {
            this._logWarn(`Failed to fetch persisted file`, err);
        }
    }

    private _statsbeatFailedToIngest() {
        if (this._shutdownStatsbeat) { // Check if callback is available
            this._failedToIngestCounter++;
            if (this._failedToIngestCounter >= 3) {
                this._shutdownStatsbeat();
            }
        }
    }
}
