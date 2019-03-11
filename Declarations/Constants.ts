import Logging = require("../Library/Logging");

export enum QuickPulseCounter {
    // Memory
    COMMITTED_BYTES= "\\Memory\\Committed Bytes",

    // CPU
    PROCESSOR_TIME= "\\Processor(_Total)\\% Processor Time",

    // Request
    REQUEST_RATE= "\\ApplicationInsights\\Requests\/Sec",
    REQUEST_FAILURE_RATE= "\\ApplicationInsights\\Requests Failed\/Sec",
    REQUEST_DURATION= "\\ApplicationInsights\\Request Duration",

    // Dependency
    DEPENDENCY_RATE= "\\ApplicationInsights\\Dependency Calls\/Sec",
    DEPENDENCY_FAILURE_RATE= "\\ApplicationInsights\\Dependency Calls Failed\/Sec",
    DEPENDENCY_DURATION= "\\ApplicationInsights\\Dependency Call Duration",

    // Exception
    EXCEPTION_RATE= "\\ApplicationInsights\\Exceptions\/Sec"
}

export enum PerformanceCounter {
    // Memory
    PRIVATE_BYTES= "\\Process(??APP_WIN32_PROC??)\\Private Bytes",
    AVAILABLE_BYTES= "\\Memory\\Available Bytes",

    // CPU
    PROCESSOR_TIME= "\\Processor(_Total)\\% Processor Time",
    PROCESS_TIME= "\\Process(??APP_WIN32_PROC??)\\% Processor Time",

    // Requests
    REQUEST_RATE= "\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Requests/Sec",
    REQUEST_DURATION= "\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Request Execution Time"
};

export function mapPerformanceCounterToQuickPulseCounter(inPerformance: PerformanceCounter): QuickPulseCounter {
    for (let key in QuickPulseCounter) {
        if (inPerformance == QuickPulseCounter[key]) {
            return QuickPulseCounter[key] as QuickPulseCounter;
        }
    }

    switch (inPerformance) {
        case PerformanceCounter.PROCESSOR_TIME:
            return QuickPulseCounter.PROCESSOR_TIME;
        case PerformanceCounter.REQUEST_RATE:
            return QuickPulseCounter.REQUEST_RATE;
        case PerformanceCounter.REQUEST_DURATION:
            return QuickPulseCounter.REQUEST_DURATION;
    }

    return null;
}
