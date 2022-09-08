export interface AgentLogger {
    log(message?: any, ...optional: any[]): void;
    error(message?: any, ...optional: any[]): void;
}

export const DiagnosticMessageId = {
    "attachSuccessful": "3000",
    "sdkExists": "3001",
    "missingIkey": "3002",
    "setupAlreadyCalled": "3003",
    "prefixFailed": "3004",
    "aadEnabled": "3005",
    "unknownError": "3006",
}

export const enum SeverityLevel {
    ERROR = "ERROR",
    WARN = "WARN",
    INFO = "INFO"
}

export interface DiagnosticLog {
    /**
     * UTC
     */
    time?: string;

    /**
     * Log severity, INFO, WARN, ERROR
     */
    level?: SeverityLevel;

    /**
     * The logger writing this message. Usually the fully-qualified class or package name
     */
    logger?: string;

    /**
     * The log message
     */
    message: string;

    /**
     * Exception (as string)
     */
    exception?: string

    /**
     * Any custom data related to the error/application/operation. Each field should have a string value
     * Examples: operation, siteName, ikey, extensionVersion, sdkVersion, subscriptionId
     */
    properties: { [key: string]: string };
}
