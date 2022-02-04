import AuthorizationHandler = require("./AuthorizationHandler");
import Logging = require("./Logging");
import Config = require("./Config");
import QuickPulseEnvelopeFactory = require("./QuickPulseEnvelopeFactory");
import QuickPulseSender = require("./QuickPulseSender");
import Constants = require("../Declarations/Constants");
import Context = require("./Context");

import * as http from "http";
import * as Contracts from "../Declarations/Contracts";


/** State Container for sending to the QuickPulse Service */
class QuickPulseStateManager {
    public config: Config;
    public context: Context;
    public authorizationHandler: AuthorizationHandler;

    private static MAX_POST_WAIT_TIME = 20000;
    private static MAX_PING_WAIT_TIME = 60000;
    private static FALLBACK_INTERVAL = 60000;
    private static PING_INTERVAL = 5000;
    private static POST_INTERVAL = 1000;

    private _isCollectingData: boolean = false;
    private _sender: QuickPulseSender;
    private _isEnabled: boolean;
    private _lastSuccessTime: number = Date.now();
    private _lastSendSucceeded: boolean = true;
    private _handle: NodeJS.Timer;
    private _metrics: { [name: string]: Contracts.MetricQuickPulse } = {};
    private _documents: Contracts.DocumentQuickPulse[] = [];
    private _collectors: { enable: (enable: boolean) => void }[] = [];
    private _redirectedHost: string = null;
    private _pollingIntervalHint: number = -1;

    constructor(config: Config, context?: Context, getAuthorizationHandler?: (config: Config) => AuthorizationHandler) {
        this.config = config;
        this.context = context || new Context();
        this._sender = new QuickPulseSender(this.config, getAuthorizationHandler);
        this._isEnabled = false;
    }

    /**
     *
     * @param collector
     */
    public addCollector(collector: any): void {
        this._collectors.push(collector);
    }

    /**
     * Override of TelemetryClient.trackMetric
     */
    public trackMetric(telemetry: Contracts.MetricTelemetry): void {
        this._addMetric(telemetry);
    }

    /**
     * Add a document to the current buffer
     * @param envelope
     */
    public addDocument(envelope: Contracts.Envelope): void {
        // Only add documents in buffer when Live Metrics is collecting data
        if (this._isCollectingData) {
            const document = QuickPulseEnvelopeFactory.telemetryEnvelopeToQuickPulseDocument(envelope);
            if (document) {
                this._documents.push(document);
            }
        }
    }

    /**
     * Enable or disable communication with QuickPulseService
     * @param isEnabled
     */
    public enable(isEnabled: boolean): void {
        if (isEnabled && !this._isEnabled) {
            this._isEnabled = true;
            this._goQuickPulse();
        } else if (!isEnabled && this._isEnabled) {
            this._isEnabled = false;
            clearTimeout(this._handle);
            this._handle = undefined;
        }
    }

    /**
     * Enable or disable all collectors in this instance
     * @param enable
     */
    private enableCollectors(enable: boolean): void {
        this._collectors.forEach(collector => {
            collector.enable(enable)
        });
    }

    /**
     * Add the metric to this buffer. If same metric already exists in this buffer, add weight to it
     * @param telemetry
     */
    private _addMetric(telemetry: Contracts.MetricTelemetry) {
        const { value } = telemetry;
        const count = telemetry.count || 1;

        let name = Constants.PerformanceToQuickPulseCounter[telemetry.name];
        if (name) {
            if (this._metrics[name]) {
                this._metrics[name].Value = (this._metrics[name].Value * this._metrics[name].Weight + value * count) / (this._metrics[name].Weight + count);
                this._metrics[name].Weight += count;
            } else {
                this._metrics[name] = QuickPulseEnvelopeFactory.createQuickPulseMetric(telemetry);
                this._metrics[name].Name = name;
                this._metrics[name].Weight = 1;
            }
        }
    }

    private _resetQuickPulseBuffer(): void {
        delete this._metrics;
        this._metrics = {};
        this._documents.length = 0;
    }

    private async _goQuickPulse(): Promise<void> {
        // Create envelope from Documents and Metrics
        const metrics = Object.keys(this._metrics).map(k => this._metrics[k]);
        const envelope = QuickPulseEnvelopeFactory.createQuickPulseEnvelope(metrics, this._documents.slice(), this.config, this.context);

        // Clear this document, metric buffer
        this._resetQuickPulseBuffer();

        // Send it to QuickPulseService, if collecting
        if (this._isCollectingData) {
            await this._post(envelope);
        } else {
            this._ping(envelope);
        }

        let pingInterval = this._pollingIntervalHint > 0 ? this._pollingIntervalHint : QuickPulseStateManager.PING_INTERVAL;
        let currentTimeout = this._isCollectingData ? QuickPulseStateManager.POST_INTERVAL : pingInterval;
        if (this._isCollectingData && Date.now() - this._lastSuccessTime >= QuickPulseStateManager.MAX_POST_WAIT_TIME && !this._lastSendSucceeded) {
            // Haven't posted successfully in 20 seconds, so wait 60 seconds and ping
            this._isCollectingData = false;
            currentTimeout = QuickPulseStateManager.FALLBACK_INTERVAL;
        } else if (!this._isCollectingData && Date.now() - this._lastSuccessTime >= QuickPulseStateManager.MAX_PING_WAIT_TIME && !this._lastSendSucceeded) {
            // Haven't pinged successfully in 60 seconds, so wait another 60 seconds
            currentTimeout = QuickPulseStateManager.FALLBACK_INTERVAL;
        }
        this._lastSendSucceeded = null;
        this._handle = <any>setTimeout(this._goQuickPulse.bind(this), currentTimeout);
        this._handle.unref(); // Don't block apps from terminating
    }

    private _ping(envelope: Contracts.EnvelopeQuickPulse): void {
        this._sender.ping(envelope, this._redirectedHost, this._quickPulseDone.bind(this));
    }

    private async _post(envelope: Contracts.EnvelopeQuickPulse): Promise<void> {
        await this._sender.post(envelope, this._redirectedHost, this._quickPulseDone.bind(this));
    }

    /**
     * Change the current QPS send state. (shouldPOST == undefined) --> error, but do not change the state yet.
     */
    private _quickPulseDone(shouldPOST?: boolean, res?: http.IncomingMessage,
        redirectedHost?: string, pollingIntervalHint?: number): void {
        if (shouldPOST != undefined) {
            if (this._isCollectingData !== shouldPOST) {
                Logging.info("Live Metrics sending data", shouldPOST);
                this.enableCollectors(shouldPOST);
            }
            this._isCollectingData = shouldPOST;

            if (redirectedHost && redirectedHost.length > 0) {
                this._redirectedHost = redirectedHost;
                Logging.info("Redirecting endpoint to: ", redirectedHost);
            }

            if (pollingIntervalHint && pollingIntervalHint > 0) {
                this._pollingIntervalHint = pollingIntervalHint;
            }

            if (res && res.statusCode < 300 && res.statusCode >= 200) {
                this._lastSuccessTime = Date.now();
                this._lastSendSucceeded = true;
            } else {
                this._lastSendSucceeded = false;
            }
        } else {
            // Received an error, keep the state as is
            this._lastSendSucceeded = false;
        }
    }
}

export = QuickPulseStateManager;