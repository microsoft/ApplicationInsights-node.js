// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { context } from "@opentelemetry/api";
import { ExportResult, ExportResultCode, suppressTracing } from "@opentelemetry/core";
import { RestError } from "@azure/core-rest-pipeline";
import { Logger } from "../logging"
import { Config, ConnectionStringParser } from "../configuration";
import { isRetriable, IBreezeResponse, IBreezeError } from "./shared/breezeUtils";
import { TelemetryItem as Envelope } from "../../declarations/generated";
import { IPersistentStorage, ISender } from "../../declarations/types";
import { DEFAULT_EXPORTER_CONFIG, IAzureExporterInternalConfig } from "../../declarations/config";
import { HttpSender } from "./shared/httpSender";
import { FileSystemPersist } from "./shared/persist";


export class LogExporter {
    protected readonly _sender: ISender;
    protected readonly _options: IAzureExporterInternalConfig;
    private readonly _persister: IPersistentStorage;
    private _numConsecutiveRedirects: number;
    private _retryTimer: NodeJS.Timer | null;

    constructor(config: Config) {
        const ingestionEndpoint = config.endpointUrl.replace("/v2.1/track", "");
        const connectionString = `InstrumentationKey=${config.instrumentationKey};IngestionEndpoint=${ingestionEndpoint}`;
        this._numConsecutiveRedirects = 0;
        this._options = {
            ...DEFAULT_EXPORTER_CONFIG,
        };
        this._options.aadTokenCredential = config.aadTokenCredential;

        if (connectionString) {
            let connectionStringPrser = new ConnectionStringParser();
            const parsedConnectionString = connectionStringPrser.parse(connectionString);
            this._options.instrumentationKey =
                parsedConnectionString.instrumentationkey ?? this._options.instrumentationKey;
            this._options.endpointUrl =
                parsedConnectionString.ingestionendpoint?.trim() ?? this._options.endpointUrl;
        }
        // Instrumentation key is required
        if (!this._options.instrumentationKey) {
            const message =
                "No instrumentation key or connection string was provided to the Azure Monitor Exporter";
            Logger.getInstance().error(message);
            throw new Error(message);
        }

        this._sender = new HttpSender(this._options);
        this._persister = new FileSystemPersist({ instrumentationKey: this._options.instrumentationKey });
        this._retryTimer = null;
        Logger.getInstance().debug("Exporter was successfully setup");

    }

    public async export(envelopes: Envelope[], resultCallback: (result: ExportResult) => void): Promise<void> {
        // prevent calls from generating spans
        context.with(suppressTracing(context.active()), async () => {
            resultCallback(await this._exportEnvelopes(envelopes));
        });
    }

    protected async _exportEnvelopes(envelopes: Envelope[]): Promise<ExportResult> {
        Logger.getInstance().info(`Exporting ${envelopes.length} envelope(s)`);
        try {
            const { result, statusCode } = await this._sender.send(envelopes);
            this._numConsecutiveRedirects = 0;
            if (statusCode === 200) {
                // Success -- @todo: start retry timer
                if (!this._retryTimer) {
                    this._retryTimer = setTimeout(() => {
                        this._retryTimer = null;
                        this._sendFirstPersistedFile();
                    }, this._options.batchSendRetryIntervalMs);
                    this._retryTimer.unref();
                }
                return { code: ExportResultCode.SUCCESS };
            } else if (statusCode && isRetriable(statusCode)) {
                // Failed -- persist failed data
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
                        // calls resultCallback(ExportResult) based on result of persister.push
                        return await this._persist(filteredEnvelopes);
                    }
                    // Failed -- not retriable
                    return {
                        code: ExportResultCode.FAILED,
                    };
                } else {
                    // calls resultCallback(ExportResult) based on result of persister.push
                    return await this._persist(envelopes);
                }
            } else {
                // Failed -- not retriable
                return {
                    code: ExportResultCode.FAILED,
                };
            }
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
                    return { code: ExportResultCode.FAILED, error: new Error("Circular redirect") };
                }
            } else if (restError.statusCode && isRetriable(restError.statusCode)) {
                return await this._persist(envelopes);
            }
            if (this._isNetworkError(restError)) {
                Logger.getInstance().error(
                    "Retrying due to transient client side error. Error message:",
                    restError.message
                );
                return await this._persist(envelopes);
            }

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
