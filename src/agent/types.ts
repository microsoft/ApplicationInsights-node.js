export const LOGGER_NAME = "applicationinsights.extension.diagnostics";
export const LOGGER_LANGUAGE = "nodejs";
export const NODE_JS_RUNTIME_MAJOR_VERSION = parseInt(process.versions.node.split('.')[0], 10);
export const AZURE_APP_NAME = process.env.WEBSITE_SITE_NAME || 'unknown';

export interface IAgentLogger {
    log(message: any, ...optional: any[]): void;
}

export interface IDiagnosticLogger {
    logMessage(log?: IDiagnosticLog): void;
}

export interface IDiagnosticLog {
    time?: string;
    message: string;
    extensionVersion?: string;
    language?: string;
    loggerName?: string;
    subscriptionId?: string;
    siteName?: string;
    instrumentationKey?: string;
    sdkVersion?: string;
    messageId?: string;
}

export interface IStatusContract {
    AgentInitializedSuccessfully?: boolean;
    Reason?: string;
    SDKPresent?: boolean;
    AppType?: string;
    MachineName?: string;
    PID?: string;
    SdkVersion?: string;
    Ikey?: string;
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
