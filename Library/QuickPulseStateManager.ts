import Logging = require("./Logging");
import Config = require("./Config");
import EnvelopeFactory = require("./EnvelopeFactory");
import QuickPulseSender = require("./QuickPulseSender");
import Constants = require("../Declarations/Constants");
import Context = require("./Context");

import * as http from "http";
import * as Contracts from "../Declarations/Contracts";

/** State Container for sending to the QuickPulse Service */
class QuickPulseStateManager {
    public config: Config;
    public context: Context;

    private _sender: QuickPulseSender;
    private _isCollectingData: boolean;
    private _isEnabled: boolean;
    private _lastSuccessTime: number = Date.now();
    private _handle: NodeJS.Timer;
    private _metrics: {[name: string]: Contracts.MetricQuickPulse} = {};
    private _documents: Contracts.DocumentQuickPulse[] = [];
    private _collectors: {enable: (enable: boolean) => void}[] = [];

    constructor(iKey?: string, context?: Context) {
        this.config = new Config(iKey);
        this.context = context || new Context();
        this._sender = new QuickPulseSender(this.config);
        this._isEnabled = false;
        this._isCollectingData = false;
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
        const document = EnvelopeFactory.telemetryEnvelopeToQuickPulseDocument(envelope);
        if (document) {
            this._documents.push(document);
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
     * Start communication with QuickPulseService
     */
    public start(): void {
        this._goQuickPulse();
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
        const {value, count} = telemetry;
        let name = Constants.mapPerformanceCounterToQuickPulseCounter(telemetry.name as Constants.PerformanceCounter);
        if (name) {
            if (this._metrics[name]) {
                this._metrics[name].Value = (this._metrics[name].Value*this._metrics[name].Weight + value*count) / (this._metrics[name].Weight + count);
                this._metrics[name].Weight += count;
            } else {
                this._metrics[name] = EnvelopeFactory.createQuickPulseMetric(telemetry);
                this._metrics[name].Name = name;
            }
        }
    }

    private _resetQuickPulseBuffer(): void {
        // TODO
        delete this._metrics;
        this._metrics = {};
        this._documents.length = 0;
    }

    private _goQuickPulse(): void {
        // Create envelope from Documents and Metrics
        const metrics = Object.keys(this._metrics).map(k => this._metrics[k]);
        const envelope = EnvelopeFactory.createQuickPulseEnvelope(metrics, this._documents.slice(), this.config, this.context);

        // Clear this document, metric buffer
        this._resetQuickPulseBuffer();

        // Send it to QuickPulseService, if collecting
        if (this._isCollectingData) {
            this._post(envelope);
        } else {
            this._ping(envelope);
        }

        let currentTimeout = this._isCollectingData ? 1000 : 5000;
        if (this._isCollectingData && Date.now() - this._lastSuccessTime >= 20000) {
            // Haven't posted successfully in 20 seconds, so wait 60 seconds and ping
            this._isCollectingData = false;
            currentTimeout = 60000;
        } else if (!this._isCollectingData && Date.now() - this._lastSuccessTime >= 60000) {
            // Haven't pinged successfully in 60 seconds, so wait another 60 seconds
            currentTimeout = 60000;
        }
        this._handle = setTimeout(this._goQuickPulse.bind(this), currentTimeout);
        this._handle.unref(); // Don't block apps from terminating
    }

    private _ping(envelope: Contracts.EnvelopeQuickPulse): void {
        this._sender.ping(envelope, this._quickPulseDone.bind(this));
    }

    private _post(envelope: Contracts.EnvelopeQuickPulse): void {
        this._sender.post(envelope, this._quickPulseDone.bind(this));
    }

    private _quickPulseDone(shouldPOST: boolean, res: http.IncomingMessage): void {
        if (this._isCollectingData !== shouldPOST) {
            Logging.info("Live Metrics sending data", shouldPOST);
            this.enableCollectors(shouldPOST);
        }
        this._isCollectingData = shouldPOST;

        if (res.statusCode < 300 && res.statusCode >= 200) {
            this._lastSuccessTime = Date.now();
        }
    }

}

export = QuickPulseStateManager;
