export declare class NetworkStatsbeat {
    time: number;
    lastTime: number;
    endpoint: number;
    host: string;
    totalRequestCount: number;
    lastRequestCount: number;
    totalSuccesfulRequestCount: number;
    totalFailedRequestCount: {
        statusCode: number;
        count: number;
    }[];
    retryCount: {
        statusCode: number;
        count: number;
    }[];
    exceptionCount: {
        exceptionType: string;
        count: number;
    }[];
    throttleCount: {
        statusCode: number;
        count: number;
    }[];
    intervalRequestExecutionTime: number;
    lastIntervalRequestExecutionTime: number;
    constructor(endpoint: number, host: string);
}
