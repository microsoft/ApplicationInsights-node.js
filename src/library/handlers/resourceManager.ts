import * as os from "os";

import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

import { APPLICATION_INSIGHTS_SDK_VERSION } from "../../declarations/constants";
import { Config } from "../configuration";


const DEFAULT_ROLE_NAME = "Web";

export class ResourceManager {
    private _config: Config;
    private _baseResource: Resource;
    private _traceResource: Resource;
    private _metricResource: Resource;
    private _logResource: Resource;
    private _internalSdkVersion: string;

    constructor(config?: Config) {
        this._config = config;
        this._baseResource = Resource.default();
        this._loadAttributes();
        this._traceResource = Resource.EMPTY.merge(this._baseResource);
        this._metricResource = Resource.EMPTY.merge(this._baseResource);
        this._logResource = Resource.EMPTY.merge(this._baseResource);
    }

    public getTraceResource(): Resource {
        return this._traceResource;
    }

    public getMetricResource(): Resource {
        return this._metricResource;
    }

    public getLogResource(): Resource {
        return this._logResource;
    }

    public getInternalSdkVersion(): string {
        return this._internalSdkVersion;
    }

    private _loadAttributes() {
        this._baseResource.attributes[SemanticResourceAttributes.SERVICE_NAME] = DEFAULT_ROLE_NAME;
        this._baseResource.attributes[SemanticResourceAttributes.SERVICE_INSTANCE_ID] = os && os.hostname();
        if (this._config && this._config.enableAutoPopulateAzureProperties) {
            if (process.env.WEBSITE_SITE_NAME) { // Azure Web apps and Functions
                this._baseResource.attributes[SemanticResourceAttributes.SERVICE_NAME] = process.env.WEBSITE_SITE_NAME;
            }
            if (process.env.WEBSITE_INSTANCE_ID) {
                this._baseResource.attributes[SemanticResourceAttributes.SERVICE_INSTANCE_ID] = process.env.WEBSITE_INSTANCE_ID;
            }
        }

        const openTelemetryVersion = this._baseResource.attributes[SemanticResourceAttributes.TELEMETRY_SDK_VERSION];
        const { node } = process.versions;
        const [nodeVersion] = node.split(".");
        this._internalSdkVersion = `node${nodeVersion}:otel${openTelemetryVersion}:ext${APPLICATION_INSIGHTS_SDK_VERSION}`;
    }
}




