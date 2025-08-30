// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from 'os';
import * as path from 'path';
import { DiagnosticLogger } from './diagnostics/diagnosticLogger';
import { FileWriter } from "./diagnostics/writers/fileWriter";
import { StatusLogger } from "./diagnostics/statusLogger";
import { AgentLoader } from "./agentLoader";
import { InstrumentationOptions } from '../types';

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
        }
    }

    public initialize() {
        // For AKS auto attach scenario, temporarily store and remove OTEL_TRACES_EXPORTER and OTEL_LOGS_EXPORTER
        // to ensure they don't interfere with useAzureMonitor setup
        const originalTracesExporter = process.env.OTEL_TRACES_EXPORTER;
        const originalLogsExporter = process.env.OTEL_LOGS_EXPORTER;
        
        delete process.env.OTEL_TRACES_EXPORTER;
        delete process.env.OTEL_LOGS_EXPORTER;

        try {
            // Call parent initialize method
            super.initialize();
        } finally {
            // Restore the original environment variables after useAzureMonitor is complete
            if (originalTracesExporter !== undefined) {
                process.env.OTEL_TRACES_EXPORTER = originalTracesExporter;
            }
            if (originalLogsExporter !== undefined) {
                process.env.OTEL_LOGS_EXPORTER = originalLogsExporter;
            }
        }
    }
}
