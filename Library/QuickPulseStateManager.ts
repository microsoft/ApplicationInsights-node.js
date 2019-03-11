import Logging = require("./Logging");
import Config = require("./Config");
import Contracts = require("../Declarations/Contracts");
import EnvelopeFactory = require("./EnvelopeFactory");
import QuickPulseSender = require("./QuickPulseSender");
import Constants = require("../Declarations/Constants");
import Context = require("./Context");

/** State Container for sending to the QuickPulse Service */
class QuickPulseStateManager {
    public config: Config;
    public context: Context;

    private _sender: QuickPulseSender;
    private _isCollectingData: boolean;
    private _isEnabled: boolean;
    private _previousTimeout: number;
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
        // TODO: use walkback for currentTimeout
        this._previousTimeout = currentTimeout;
        this._handle = setTimeout(this._goQuickPulse.bind(this), currentTimeout);
    }

    private _ping(envelope: Contracts.EnvelopeQuickPulse): void {
        Logging.info("Sending ping");
        this._sender.ping(envelope, this._quickPulseDone.bind(this));
    }

    private _post(envelope: Contracts.EnvelopeQuickPulse): void {
        Logging.info("Sending post");
        this._sender.post(envelope, this._quickPulseDone.bind(this));
    }

    private _quickPulseDone(shouldPOST: boolean): void {
        if (this._isCollectingData !== shouldPOST) {
            Logging.info("shouldPost updated value", shouldPOST);
            this.enableCollectors(shouldPOST);
        }
        this._isCollectingData = shouldPOST;
    }

}

export = QuickPulseStateManager;
