export class NetworkStatsbeat {
    public time: number | undefined;

    public lastTime: number;

    public endpoint: string;

    public host: string;

    public totalRequestCount: number;

    public lastRequestCount: number;

    public totalSuccesfulRequestCount: number;

    public totalFailedRequestCount: { statusCode: number; count: number }[];

    public retryCount: { statusCode: number; count: number }[];

    public exceptionCount: { exceptionType: string; count: number }[];

    public throttleCount: { statusCode: number; count: number }[];

    public intervalRequestExecutionTime: number;

    public lastIntervalRequestExecutionTime: number;

    public averageRequestExecutionTime: number;

    constructor(endpoint: string, host: string) {
        this.endpoint = endpoint;
        this.host = host;
        this.totalRequestCount = 0;
        this.totalSuccesfulRequestCount = 0;
        this.totalFailedRequestCount = [];
        this.retryCount = [];
        this.exceptionCount = [];
        this.throttleCount = [];
        this.intervalRequestExecutionTime = 0;
        this.lastIntervalRequestExecutionTime = 0;
        this.lastTime = +new Date();
        this.lastRequestCount = 0;
    }
}

export interface CommonStatsbeatProperties {
    os: string;
    rp: string;
    cikey: string;
    runtimeVersion: string;
    language: string;
    version: string;
    attach: string;
}

export interface NetworkStatsbeatProperties {
    endpoint: string;
    host: string;
}

export interface AttachStatsbeatProperties {
    rpId: string;
}

export const StatsbeatTelemetryName = "Statsbeat";

export const StatsbeatResourceProvider = {
    appsvc: "appsvc",
    functions: "functions",
    vm: "vm",
    unknown: "unknown",
};

export const StatsbeatAttach = {
    codeless: "codeless",
    sdk: "sdk",
};

export const StatsbeatCounter = {
    REQUEST_SUCCESS: "Request Success Count",
    REQUEST_FAILURE: "Request Failure Count",
    REQUEST_DURATION: "Request Duration",
    RETRY_COUNT: "Retry Count",
    THROTTLE_COUNT: "Throttle Count",
    EXCEPTION_COUNT: "Exception Count",
    ATTACH: "Attach",
    FEATURE: "Feature",
};

export enum StatsbeatFeature {
    DISK_RETRY = 0,
    AAD_HANDLING = 1,
    WEB_SNIPPET = 2,
    DISTRO = 4,
}

export enum StatsbeatInstrumentation {
    AZURE_CORE_TRACING = 0,
    MONGODB = 1,
    MYSQL = 2,
    REDIS = 4,
    POSTGRES = 8,
    BUNYAN = 16,
    WINSTON = 32,
    CONSOLE = 64,
}

export enum StatsbeatFeatureType {
    Feature,
    Instrumentation,
}

export enum StatsbeatNetworkCategory {
    Breeze,
    Quickpulse,
}

export const NON_EU_CONNECTION_STRING =
  "InstrumentationKey=c4a29126-a7cb-47e5-b348-11414998b11e;IngestionEndpoint=https://westus-0.in.applicationinsights.azure.com";
export const EU_CONNECTION_STRING =
  "InstrumentationKey=7dc56bab-3c0c-4e9f-9ebb-d1acadee8d0f;IngestionEndpoint=https://westeurope-5.in.applicationinsights.azure.com";
export const EU_ENDPOINTS = [
  "westeurope",
  "northeurope",
  "francecentral",
  "francesouth",
  "germanywestcentral",
  "norwayeast",
  "norwaywest",
  "swedencentral",
  "switzerlandnorth",
  "switzerlandwest",
  "uksouth",
  "ukwest"
];
