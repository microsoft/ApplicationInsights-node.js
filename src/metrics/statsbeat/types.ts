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
    NONE = 0,
    DISK_RETRY = 1,
    AAD_HANDLING = 2,
}

export enum StatsbeatInstrumentation {
    NONE = 0,
    AZURE_CORE_TRACING = 1,
    MONGODB = 2,
    MYSQL = 4,
    REDIS = 8,
    POSTGRES = 16,
    BUNYAN = 32,
    WINSTON = 64,
    CONSOLE = 128,
}

export enum StatsbeatFeatureType {
    Feature,
    Instrumentation,
}

export enum StatsbeatNetworkCategory {
    Breeze,
    Quickpulse,
}
