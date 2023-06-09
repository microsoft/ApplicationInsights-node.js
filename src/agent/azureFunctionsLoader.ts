// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Resource } from "@opentelemetry/resources";
import { AgentLoader } from "./agentLoader";
import { DiagnosticLogger } from "./diagnostics/diagnosticLogger";
import { StatusLogger } from "./diagnostics/statusLogger";
import { AzureFunctionsWriter } from "./diagnostics/writers/azureFunctionsWriter";
import { AgentResourceProviderType, AZURE_MONITOR_AGENT_PREFIX } from "./types";
import { Attributes } from "@opentelemetry/api";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

export class AzureFunctionsLoader extends AgentLoader {
    constructor() {
        super();
        if (this._canLoad) {
            // Azure Fn specific configuration
            this._config.enableAutoCollectPerformance = false;
            this._config.enableAutoCollectStandardMetrics = false;
            const resourceAttributes: Attributes = {};
            if (process.env.WEBSITE_SITE_NAME) {
                resourceAttributes[SemanticResourceAttributes.SERVICE_NAME] =
                    process.env.WEBSITE_SITE_NAME;
            }
            if (process.env.WEBSITE_INSTANCE_ID) {
                resourceAttributes[SemanticResourceAttributes.SERVICE_INSTANCE_ID] =
                    process.env.WEBSITE_INSTANCE_ID;
            }
            const resource = new Resource(resourceAttributes);
            this._config.resource = resource;

            const writer = new AzureFunctionsWriter(this._instrumentationKey);
            this._diagnosticLogger = new DiagnosticLogger(this._instrumentationKey, writer);
            this._statusLogger = new StatusLogger(this._instrumentationKey, writer);
            process.env[AZURE_MONITOR_AGENT_PREFIX] = this._getVersionPrefix(
                AgentResourceProviderType.azureFunctions
            );
        }
    }
}
