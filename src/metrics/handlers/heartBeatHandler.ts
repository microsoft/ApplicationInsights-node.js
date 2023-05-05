import * as crypto from "crypto";
import * as os from "os";
import { AzureMonitorMetricExporter } from "@azure/monitor-opentelemetry-exporter";
import {
    Meter,
    ObservableCallback,
    ObservableGauge,
    ObservableResult,
} from "@opentelemetry/api";
import {
    MeterProvider,
    PeriodicExportingMetricReader,
    PeriodicExportingMetricReaderOptions,
} from "@opentelemetry/sdk-metrics";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { ApplicationInsightsConfig } from "../../shared";

const HeartBeatMetricName = "HeartbeatState";

export class HeartBeatHandler {
    private _collectionInterval = 900000;
    private _config: ApplicationInsightsConfig;
    private _meterProvider: MeterProvider;
    private _azureExporter: AzureMonitorMetricExporter;
    private _metricReader: PeriodicExportingMetricReader;
    private _meter: Meter;
    private _metricGauge: ObservableGauge;
    private _metricGaugeCallback: ObservableCallback;
    private _machineProperties: { [key: string]: string };
    private _uniqueProcessId: string;

    constructor(config: ApplicationInsightsConfig, options?: { collectionInterval: number }) {
        this._config = config;
        this._meterProvider = new MeterProvider();
        this._azureExporter = new AzureMonitorMetricExporter(this._config.azureMonitorExporterConfig);
        const metricReaderOptions: PeriodicExportingMetricReaderOptions = {
            exporter: this._azureExporter as any,
            exportIntervalMillis: options?.collectionInterval || this._collectionInterval,
        };
        this._metricReader = new PeriodicExportingMetricReader(metricReaderOptions);
        this._meterProvider.addMetricReader(this._metricReader);
        this._meter = this._meterProvider.getMeter("ApplicationInsightsHeartBeatMeter");
        this._metricGauge = this._meter.createObservableGauge(HeartBeatMetricName);
        this._metricGaugeCallback = this._trackHeartBeat.bind(this);
        this._metricGauge.addCallback(this._metricGaugeCallback);
    }

    /** 
 * @deprecated This should not be used
 */
    public enable(isEnabled: boolean) {
        // No Op
    }

    /** 
  * @deprecated This should not be used
  */
    public start() {
        // No Op
    }

    public async shutdown(): Promise<void> {
        await this._meterProvider.shutdown();
    }

    public async flush(): Promise<void> {
        await this._meterProvider.forceFlush();
    }

    private async _trackHeartBeat(observableResult: ObservableResult) {
        this._machineProperties = this._getMachineProperties();
        observableResult.observe(0, this._machineProperties);
    }

    private _getMachineProperties(): { [key: string]: string } {
        const properties: { [key: string]: string } = {};
        const sdkVersion =
            String(
                this._config.resource.attributes[
                SemanticResourceAttributes.TELEMETRY_SDK_VERSION
                ]
            ) || null;
        properties["sdkVersion"] = sdkVersion;
        properties["osType"] = os.type();
        properties["osVersion"] = os.release();
        //  Random GUID that would help in analysis when app has stopped and restarted.
        if (!this._uniqueProcessId) {
            this._uniqueProcessId = crypto.randomBytes(16).toString("hex");
        }
        properties["processSessionId"] = this._uniqueProcessId;

        if (process.env.WEBSITE_SITE_NAME) {
            properties["appSrv_SiteName"] = process.env.WEBSITE_SITE_NAME;
        }
        if (process.env.WEBSITE_HOME_STAMPNAME) {
            properties["appSrv_wsStamp"] = process.env.WEBSITE_HOME_STAMPNAME;
        }
        if (process.env.WEBSITE_HOSTNAME) {
            properties["appSrv_wsHost"] = process.env.WEBSITE_HOSTNAME;
        }
        if (process.env.WEBSITE_OWNER_NAME) {
            properties["appSrv_wsOwner"] = process.env.WEBSITE_OWNER_NAME;
        }
        if (process.env.WEBSITE_RESOURCE_GROUP) {
            properties["appSrv_ResourceGroup"] = process.env.WEBSITE_RESOURCE_GROUP;
        }
        if (process.env.WEBSITE_SLOT_NAME) {
            properties["appSrv_SlotName"] = process.env.WEBSITE_SLOT_NAME;
        }
        return properties;
    }
}
