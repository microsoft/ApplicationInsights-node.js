// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from 'os';
import * as path from 'path';
import { Attributes } from '@opentelemetry/api';
import {
    SEMRESATTRS_SERVICE_NAME,
    SEMRESATTRS_SERVICE_INSTANCE_ID,
} from '@opentelemetry/semantic-conventions';
import { Resource } from '@opentelemetry/resources';
import { DiagnosticLogger } from './diagnostics/diagnosticLogger';
import { EtwDiagnosticLogger } from './diagnostics/etwDiagnosticLogger';
import { FileWriter } from "./diagnostics/writers/fileWriter";
import { StatusLogger } from "./diagnostics/statusLogger";
import { AgentLoader } from "./agentLoader";

export class AppServicesLoader extends AgentLoader {

    constructor() {
        super();
        if (this._canLoad) {
            // Azure App Services specific configuration
            const resourceAttributes: Attributes = {};
            if (process.env.WEBSITE_SITE_NAME) {
                resourceAttributes[SEMRESATTRS_SERVICE_NAME] =
                    process.env.WEBSITE_SITE_NAME;
            }
            if (process.env.WEBSITE_INSTANCE_ID) {
                resourceAttributes[SEMRESATTRS_SERVICE_INSTANCE_ID] =
                    process.env.WEBSITE_INSTANCE_ID;
            }
            const resource = new Resource(resourceAttributes);
            this._options.resource = resource;

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

            if (this._isWindows) {
                this._diagnosticLogger = new EtwDiagnosticLogger(
                    this._instrumentationKey
                );
            }
            else{
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
    }
}
