// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from 'os';
import * as path from 'path';
import { DiagnosticLogger } from './diagnostics/diagnosticLogger';
import { FileWriter } from "./diagnostics/writers/fileWriter";
import { StatusLogger } from "./diagnostics/statusLogger";
import { AgentLoader } from "./agentLoader";
import { InstrumentationOptions } from '../types';
import { OTLPMetricExporter as OTLPProtoMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { MetricReader, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { OTLP_METRIC_EXPORTER_EXPORT_INTERVAL } from './types';

export class AKSLoader extends AgentLoader {

    constructor() {
        super();
        if (this._canLoad) {
            (this._options.instrumentationOptions as InstrumentationOptions) = {
                ...this._options.instrumentationOptions,
                console: { enabled: true },
                bunyan: { enabled: true },
                winston: { enabled: true },
            }

            let statusLogDir = '/var/log/applicationinsights/';
            if (this._isWindows) {
                if (process.env.HOME) {
                    statusLogDir = path.join(process.env.HOME, "LogFiles", "ApplicationInsights", "status");
                }
                else {
                    statusLogDir = path.join(os.tmpdir(), "Microsoft", "ApplicationInsights", "StatusMonitor", "LogFiles", "ApplicationInsights", "status");
                }
            }
            this._statusLogger = new StatusLogger(this._instrumentationKey, new FileWriter(statusLogDir, 'status_nodejs.json', {
                append: false,
                deleteOnExit: false,
                renamePolicy: 'overwrite',
                sizeLimit: 1024 * 1024,
            }));

            this._diagnosticLogger = new DiagnosticLogger(
                this._instrumentationKey,
                new FileWriter(
                    statusLogDir,
                    'applicationinsights-extension.log',
                    {
                        append: true,
                        deleteOnExit: false,
                        renamePolicy: 'overwrite',
                        sizeLimit: 1024 * 1024, // 1 MB
                    }
                )
            );

            // Create metricReaders array and add OTLP reader if environment variables request it
            try {
                const metricReaders: MetricReader[] = [];
                if (
                    process.env.OTEL_METRICS_EXPORTER === "otlp" &&
                    (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT)
                ) {
                    try {
                        const otlpExporter = new OTLPProtoMetricExporter();

                        const otlpMetricReader = new PeriodicExportingMetricReader({
                            exporter: otlpExporter,
                            exportIntervalMillis: OTLP_METRIC_EXPORTER_EXPORT_INTERVAL,
                        });

                        metricReaders.push(otlpMetricReader);
                    } catch (error) {
                        console.warn("AKSLoader: Failed to create OTLP metric reader:", error);
                    }
                }

                // Attach metricReaders to the options so the distro can consume them
                if ((metricReaders || []).length > 0) {
                    this._options.metricReaders = metricReaders;
                }
            } catch (err) {
                console.warn("AKSLoader: Error while preparing metricReaders:", err);
            }
        }
    }
}
