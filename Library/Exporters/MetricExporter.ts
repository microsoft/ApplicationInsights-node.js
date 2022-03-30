// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { diag } from "@opentelemetry/api";
import { ExportResult } from "@opentelemetry/core";
import { AzureExporterConfig } from "@azure/monitor-opentelemetry-exporter";

import { MetricTelemetry } from "../../Declarations/Contracts";
import * as  Constants from "../../Declarations/Constants";
import { TelemetryItem as Envelope, MetricsData, MetricDataPoint, KnownDataPointType } from "../../Declarations/Generated";
import { BaseExporter } from "./Shared/BaseExporter";
import { Config } from "../Configuration/Config";
import { Context } from "../Context";
import { Util } from "../Util/Util";


export class AzureMonitorMetricExporter extends BaseExporter {

    private _config: Config;
    private _clientContext: Context;

    constructor(config: Config, context: Context) {
        let ingestionEndpoint = config.endpointUrl.replace("/v2.1/track", "");
        let connectionString = `InstrumentationKey=${config.instrumentationKey};IngestionEndpoint=${ingestionEndpoint}`;
        let exporterConfig: AzureExporterConfig = {
            connectionString: connectionString
        };
        super(exporterConfig);
        this._config = config;
        this._clientContext = context;
    }

    /** Exports the list of a given {@link MetricRecord} */
    public async export(metrics: MetricTelemetry[], resultCallback: (result: ExportResult) => void): Promise<void> {
        diag.info(`Exporting ${metrics.length} metric(s). Converting to envelopes...`);
        const envelopes = metrics.map((metric) =>
            this._metricToEnvelope(metric, this._options.instrumentationKey)
        );
        resultCallback(await this._exportEnvelopes(envelopes));
    }

    /** Exports the list of a given {@link MetricRecord} */
    public async exportStatsbeat(metrics: MetricTelemetry[], resultCallback: (result: ExportResult) => void): Promise<void> {
        diag.info(`Exporting ${metrics.length} metric(s). Converting to envelopes...`);
        const envelopes = metrics.map((metric) => {
            let envelope = this._metricToEnvelope(metric, this._options.instrumentationKey);
            envelope.name = Constants.StatsbeatTelemetryName;
            return envelope;
        }
        );
        resultCallback(await this._exportEnvelopes(envelopes));
    }

    /**
     * Shutdown AzureMonitorTraceExporter.
     */
    async shutdown(): Promise<void> {
        diag.info("Azure Monitor Metrics Exporter shutting down");
        return this._sender.shutdown();
    }

    /**
     * Metric to Azure envelope parsing.
     * @internal
     */
    private _metricToEnvelope(telemetry: MetricTelemetry, instrumentationKey: string): Envelope {
        let baseType: "MetricsData";
        let version = 1;
        let baseData: MetricsData = { metrics: [] };
        const time = (new Date());
        // Exclude metrics from sampling by default
        let sampleRate = 100;
        let properties = {};

        const tags = this._getTags(this._clientContext);
        let name =
            "Microsoft.ApplicationInsights." +
            instrumentationKey.replace(/-/g, "") +
            "." +
            baseType.substr(0, baseType.length - 4);
        if (telemetry.properties) {
            // sanitize properties
            properties = Util.getInstance().validateStringMap(telemetry.properties);
        }

        telemetry.metrics.forEach(metricPoint => {
            var metricDataPoint: MetricDataPoint = {
                name: metricPoint.name,
                value: metricPoint.value
            };
            metricDataPoint.count = !isNaN(metricPoint.count) ? metricPoint.count : 1;
            metricDataPoint.dataPointType = KnownDataPointType.Aggregation; // Aggregation for Manual APIs
            metricDataPoint.max = !isNaN(metricPoint.max) ? metricPoint.max : metricPoint.value;
            metricDataPoint.min = !isNaN(metricPoint.min) ? metricPoint.min : metricPoint.value;
            metricDataPoint.stdDev = !isNaN(metricPoint.stdDev) ? metricPoint.stdDev : 0;
            metricDataPoint.namespace = metricPoint.namespace;
            baseData.metrics.push(metricDataPoint);
        });

        return {
            name,
            sampleRate,
            time,
            instrumentationKey,
            tags,
            version: version,
            data: {
                baseType,
                baseData: {
                    ...baseData,
                    properties,
                },
            },
        };
    }

    private _getTags(context: Context) {
        // Make a copy of context tags so we don't alter the actual object
        // Also perform tag overriding
        var newTags = <{ [key: string]: string }>{};
        if (context && context.tags) {
            for (var key in context.tags) {
                newTags[key] = context.tags[key];
            }
        }
        return newTags;
    }
}
