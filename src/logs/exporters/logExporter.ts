// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { context } from "@opentelemetry/api";
import { ExportResult, ExportResultCode, suppressTracing } from "@opentelemetry/core";
import { RestError } from "@azure/core-rest-pipeline";
import { AzureMonitorExporterOptions } from "@azure/monitor-opentelemetry-exporter";

import { Logger } from "../../shared/logging";
import { ConnectionStringParser } from "../../shared/configuration";
import { isRetriable, IBreezeResponse, IBreezeError } from "./breezeUtils";
import { TelemetryItem as Envelope } from "../../declarations/generated";
import { IPersistentStorage, ISender } from "./types";
import { HttpSender } from "./httpSender";
import { FileSystemPersist } from "./persist";
import { DEFAULT_BREEZE_ENDPOINT } from "../../declarations/constants";
import { Statsbeat } from "../../metrics/statsbeat";

const DEFAULT_BATCH_SEND_RETRY_INTERVAL_MS = 60_000;

export class LogExporter {
    private _instrumentationKey: string;
    private _endpointUrl: string;
    private readonly _sender: ISender;
    private readonly _options: AzureMonitorExporterOptions;
    private readonly _persister: IPersistentStorage;
    private _numConsecutiveRedirects: number;
    private _retryTimer: NodeJS.Timer | null;
    private _batchSendRetryIntervalMs: number = DEFAULT_BATCH_SEND_RETRY_INTERVAL_MS;
    private _statsbeatMetrics: Statsbeat;

    constructor(options: AzureMonitorExporterOptions) {
        this._options = options;
        this._numConsecutiveRedirects = 0;
        this._instrumentationKey = "";
        this._endpointUrl = DEFAULT_BREEZE_ENDPOINT;

        if (this._options.connectionString) {
            const parser = new ConnectionStringParser();
            const parsedConnectionString = parser.parse(this._options.connectionString);
            this._instrumentationKey =
                parsedConnectionString.instrumentationkey || this._instrumentationKey;
            this._endpointUrl =
                parsedConnectionString.ingestionendpoint?.trim() || this._endpointUrl;
        }

        // Instrumentation key is required
        if (!this._instrumentationKey) {
            const message =
                "No instrumentation key or connection string was provided to the Azure Monitor Exporter";
            Logger.getInstance().error(message);
            throw new Error(message);
        }
        this._sender = new HttpSender(this._endpointUrl, this._options);
        this._persister = new FileSystemPersist(this._instrumentationKey, this._options);
        this._retryTimer = null;
        Logger.getInstance().debug("Exporter was successfully setup");
    }

    public async export(
        envelopes: Envelope[],
        resultCallback: (result: ExportResult) => void
    ): Promise<void> {
        // prevent calls from generating spans
        context.with(suppressTracing(context.active()), async () => {
            resultCallback(await this._exportEnvelopes(envelopes));
        });
    }

    protected async _exportEnvelopes(envelopes: Envelope[]): Promise<ExportResult> {
        Logger.getInstance().info(`Exporting ${envelopes.length} envelope(s)`);
        try {
            const startTime = new Date().getTime();
            const { result, statusCode } = await this._sender.send(envelopes);
            const endTime = new Date().getTime();
            const duration = endTime - startTime;
            this._numConsecutiveRedirects = 0;
            if (statusCode === 200) {
                // Success -- @todo: start retry timer
                if (!this._retryTimer) {
                    this._retryTimer = setTimeout(() => {
                        this._retryTimer = null;
                        this._sendFirstPersistedFile();
                    }, this._batchSendRetryIntervalMs);
                    this._retryTimer.unref();
                }
                this._statsbeatMetrics?.countSuccess(duration);
                return { code: ExportResultCode.SUCCESS };
            } else if (statusCode && isRetriable(statusCode)) {
                // Failed -- persist failed data
                if (statusCode === 429 || statusCode === 439) {
                    this._statsbeatMetrics?.countThrottle(statusCode);
                }
                if (result) {
                    Logger.getInstance().info(result);
                    const breezeResponse = JSON.parse(result) as IBreezeResponse;
                    const filteredEnvelopes: Envelope[] = [];
                    breezeResponse.errors.forEach((error: IBreezeError) => {
                        if (error.statusCode && isRetriable(error.statusCode)) {
                            filteredEnvelopes.push(envelopes[error.index]);
                        }
                    });
                    if (filteredEnvelopes.length > 0) {
                        this._statsbeatMetrics?.countRetry(statusCode);
                        // calls resultCallback(ExportResult) based on result of persister.push
                        return await this._persist(filteredEnvelopes);
                    }
                    // Failed -- not retriable
                    this._statsbeatMetrics?.countFailure(duration, statusCode);
                    return {
                        code: ExportResultCode.FAILED,
                    };
                }
                // calls resultCallback(ExportResult) based on result of persister.push
                return await this._persist(envelopes);
            }
            // Failed -- not retriable
            if (statusCode) {
                this._statsbeatMetrics.countFailure(duration, statusCode);
            }
            return {
                code: ExportResultCode.FAILED,
            };
        } catch (error) {
            const restError = error as RestError;
            if (
                restError.statusCode &&
                (restError.statusCode === 307 || // Temporary redirect
                    restError.statusCode === 308)
            ) {
                // Permanent redirect
                this._numConsecutiveRedirects++;
                // To prevent circular redirects
                if (this._numConsecutiveRedirects < 10) {
                    if (restError.response && restError.response.headers) {
                        const location = restError.response.headers.get("location");
                        if (location) {
                            // Update sender URL
                            this._sender.handlePermanentRedirect(location);
                            // Send to redirect endpoint as HTTPs library doesn't handle redirect automatically
                            return this._exportEnvelopes(envelopes);
                        }
                    }
                } else {
                    const redirectError = new Error("Circular redirect");
                    this._statsbeatMetrics?.countException(redirectError);
                    return { code: ExportResultCode.FAILED, error: redirectError };
                }
            } else if (restError.statusCode && isRetriable(restError.statusCode)) {
                this._statsbeatMetrics?.countRetry(restError.statusCode);
                return await this._persist(envelopes);
            }
            if (this._isNetworkError(restError)) {
                if (restError.statusCode) {
                    this._statsbeatMetrics?.countRetry(restError.statusCode);
                }
                Logger.getInstance().error(
                    "Retrying due to transient client side error. Error message:",
                    restError.message
                );
                return await this._persist(envelopes);
            }
            this._statsbeatMetrics?.countException(restError);
            Logger.getInstance().error(
                "Envelopes could not be exported and are not retriable. Error message:",
                restError.message
            );
            return { code: ExportResultCode.FAILED, error: restError };
        }
    }

    /**
     * Shutdown
     */
    public async shutdown(): Promise<void> {
        Logger.getInstance().info("Exporter shutting down");
        return this._sender.shutdown();
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
                await this._sender.send(envelopes);
            }
        } catch (err) {
            Logger.getInstance().warn(`Failed to fetch persisted file`, err);
        }
    }

    private _isNetworkError(error: RestError): boolean {
        if (error && error.code && error.code === "REQUEST_SEND_ERROR") {
            return true;
        }
        return false;
    }
}
