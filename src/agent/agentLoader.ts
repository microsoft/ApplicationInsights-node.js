// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ManagedIdentityCredential } from "@azure/identity";
import { TelemetryClient } from "../shim/telemetryClient";
import { Util } from "../shim/util";
import { ConsoleWriter } from "./diagnostics/writers/consoleWriter";
import { DiagnosticLogger } from "./diagnostics/diagnosticLogger";
import { StatusLogger } from "./diagnostics/statusLogger";
import { AgentResourceProviderType, DiagnosticMessageId, IDiagnosticLog, IDiagnosticLogger, NODE_JS_RUNTIME_MAJOR_VERSION } from "./types";
import { ApplicationInsightsOptions } from "../types";


const forceStart = process.env.APPLICATIONINSIGHTS_FORCE_START === "true";
// Azure Connection String
const ENV_connectionString = "APPLICATIONINSIGHTS_CONNECTION_STRING";
const ENV_AZURE_PREFIX = "APPSETTING_"; // Azure adds this prefix to all environment variables
const ENV_IKEY = "APPINSIGHTS_INSTRUMENTATIONKEY"; // This key is provided in the readme
const LEGACY_ENV_IKEY = "APPINSIGHTS_INSTRUMENTATION_KEY";


export class AgentLoader {
    protected _canLoad: boolean;
    protected _options: ApplicationInsightsOptions;
    protected _instrumentationKey: string;
    protected _diagnosticLogger: IDiagnosticLogger;
    protected _statusLogger: StatusLogger;
    protected _isWindows: boolean;
    private _aadCredential: any; // Types not available as library should not be loaded in older versions of Node.js runtime

    constructor() {
        // Open Telemetry and AAD packages unsusable in older versions of Node.js runtime
        if (NODE_JS_RUNTIME_MAJOR_VERSION <= 8) {
            this._canLoad = false;
        }
        else {
            this._canLoad = true;
            this._aadCredential = this._getAuthenticationCredential();
            // Default options
            this._options = {
                azureMonitorExporterConfig: {
                    disableOfflineStorage: false,
                },
                enableAutoCollectExceptions: true,
                enableAutoCollectPerformance: true,
                enableAutoCollectStandardMetrics: true,
                samplingRatio: 1, // Sample all telemetry by default
                instrumentationOptions: {
                    azureSdk: {
                        enabled: true
                    },
                    http: {
                        enabled: true
                    },
                    mongoDb: {
                        enabled: true
                    },
                    mySql: {
                        enabled: true
                    },
                    postgreSql: {
                        enabled: true
                    },
                    redis4: {
                        enabled: true
                    },
                    redis: {
                        enabled: true
                    },
                }
            };

            const connectionString = process.env[ENV_connectionString];
            if (connectionString) {
                this._instrumentationKey = this._getInstrumentationKey(connectionString);
            }
            else {
                const instrumentationKey =
                    process.env[ENV_IKEY] ||
                    process.env[ENV_AZURE_PREFIX + ENV_IKEY] ||
                    process.env[LEGACY_ENV_IKEY] ||
                    process.env[ENV_AZURE_PREFIX + LEGACY_ENV_IKEY];
                this._instrumentationKey = instrumentationKey || "unknown";

            }


            //Default diagnostic using console
            this._diagnosticLogger = new DiagnosticLogger(this._instrumentationKey, new ConsoleWriter());
            this._statusLogger = new StatusLogger(this._instrumentationKey, new ConsoleWriter());
            this._isWindows = process.platform === 'win32';
        }
    }

    private _getInstrumentationKey(connectionString: string) {
        if (connectionString) {
            const kvPairs = connectionString.split(";");
            for (let i = 0; i < kvPairs.length; i++) {
                const kvParts = kvPairs[i].split("=");
                if (kvParts.length === 2 && kvParts[0].toLowerCase() === "instrumentationkey") {
                    return kvParts[1];
                }
            }
        }
        return "";
    }

    // Exposed so ETW logger could be provider in IPA code
    public setLogger(logger: IDiagnosticLogger) {
        this._diagnosticLogger = logger;
    }

    public initialize(): void {
        if (!this._canLoad) {
            const msg = `Cannot load Azure Monitor Application Insights Distro because of unsupported Node.js runtime, currently running in version ${NODE_JS_RUNTIME_MAJOR_VERSION}`;
            console.log(msg);
            return;
        }
        if (this._validate()) {
            try {
                // TODO: Set Prefix 

                // Initialize Distro
                this._options.azureMonitorExporterConfig.aadTokenCredential = this._aadCredential;
                const appInsightsClient = new TelemetryClient(this._options);
                // Agent successfully initialized
                const diagnosticLog: IDiagnosticLog = {
                    message: "Azure Monitor Application Insights Distro was started succesfully.",
                    messageId: DiagnosticMessageId.attachSuccessful
                };
                this._diagnosticLogger.logMessage(diagnosticLog);
                this._statusLogger.logStatus({
                    AgentInitializedSuccessfully: true
                });

            }
            catch (error) {
                const msg = `Error initializaing Azure Monitor Application Insights Distro.${Util.getInstance().dumpObj(error)}`;
                const diagnosticLog: IDiagnosticLog = {
                    message: msg,
                    messageId: DiagnosticMessageId.unknownError
                };
                this._diagnosticLogger.logMessage(diagnosticLog);
                this._statusLogger.logStatus({
                    AgentInitializedSuccessfully: false,
                    Reason: msg
                })
            }
        }
    }

    private _validate(): boolean {
        try {
            if (!forceStart && this._sdkAlreadyExists()) {
                this._statusLogger.logStatus({
                    AgentInitializedSuccessfully: false,
                    SDKPresent: true,
                    Reason: "Azure Monitor Application Insights Distro already available."
                })
                return false;
            }
            if (this._instrumentationKey === "unknown") {
                const diagnosticLog: IDiagnosticLog = {
                    message: "Azure Monitor Application Insights Distro wanted to be started, but no Connection String was provided",
                    messageId: DiagnosticMessageId.missingIkey
                };
                this._diagnosticLogger.logMessage(diagnosticLog);
                this._statusLogger.logStatus({
                    AgentInitializedSuccessfully: false,
                    Reason: diagnosticLog.message
                });
                return false;
            }
            return true;
        }
        catch (err: any) {
            const msg = `Failed to validate Azure Monitor Application Insights Distro initialization.${Util.getInstance().dumpObj(err)}`;
            console.log(msg);
            if (this._diagnosticLogger) {
                const diagnosticLog: IDiagnosticLog = {
                    message: msg,
                    messageId: DiagnosticMessageId.unknownError
                };
                this._diagnosticLogger.logMessage(diagnosticLog);
            }
            if (this._statusLogger) {
                this._statusLogger.logStatus({
                    AgentInitializedSuccessfully: false,
                    Reason: msg
                });
            }
        }
    }

    private _getAuthenticationCredential(): any {
        let credential = undefined;
        // Try to add AAD Token Credential
        try {
            const authenticationString = process.env["APPLICATIONINSIGHTS_AUTHENTICATION_STRING"];
            if (authenticationString) {
                const kvPairs = authenticationString.split(";");
                const result = kvPairs.reduce((fields: any, kv: string) => {
                    const kvParts = kv.split("=");
                    if (kvParts.length === 2) { // only save fields with valid formats
                        const key = kvParts[0].toLowerCase();
                        const value = kvParts[1];
                        fields[key] = value as string;
                    }
                    return fields;
                }, {});
                if (result["authorization"] && result["authorization"] === "AAD") {
                    const clientId = result["clientid"];
                    if (clientId) {
                        console.log('AppInsightsAgent: ClientId found, trying to authenticate using Managed Identity.');
                        credential = new ManagedIdentityCredential(clientId);
                    }
                    else {
                        console.log('AppInsightsAgent: Trying to authenticate using System assigned Managed Identity.');
                        credential = new ManagedIdentityCredential(); // System assigned identity
                    }
                }
            }
        }
        catch (authError: any) {
            const msg = `Failed to get authentication credential and enable AAD.${Util.getInstance().dumpObj(authError)}`;
            console.log(msg);
            if (this._diagnosticLogger) {
                const diagnosticLog: IDiagnosticLog = {
                    message: msg,
                    messageId: DiagnosticMessageId.aadEnabled
                };
                this._diagnosticLogger.logMessage(diagnosticLog);
            }
        }
        return credential;
    }

    private _sdkAlreadyExists(): boolean {
        try {
            // appInstance should either resolve to user SDK or crash. If it resolves to attach SDK, user probably modified their NODE_PATH
            let appInstance: string;
            try {
                // Node 8.9+
                appInstance = (require.resolve as any)("applicationinsights", { paths: [process.cwd()] });
            } catch (e) {
                // Node <8.9
                appInstance = require.resolve(`${process.cwd()}/node_modules/applicationinsights`);
            }
            // If loaded instance is in Azure machine home path do not attach the SDK, this means customer already instrumented their app
            if (appInstance.indexOf("home") > -1) {
                const diagnosticLog: IDiagnosticLog = {
                    message: `Azure Monitor Application Insights Distro already exists. Module is already installed in this application; not re-attaching. Location: ${appInstance}`,
                    messageId: DiagnosticMessageId.sdkExists
                };
                this._diagnosticLogger.logMessage(diagnosticLog);
                return true;
            }

            // ApplicationInsights could be loaded outside of customer application, attach in this case
            return false;

        } catch (e) {
            // crashed while trying to resolve "applicationinsights", so SDK does not exist. Attach appinsights
            return false;
        }
    }

    protected _getVersionPrefix(rpType: AgentResourceProviderType): string {
        let rp = "u"; // Default unknown
        let os = "u"; // Default unknown
        if (rpType === AgentResourceProviderType.aks) {
            rp = "k";
        }
        else if (rpType === AgentResourceProviderType.appServices) {
            rp = "a";
        }
        else if (rpType === AgentResourceProviderType.azureFunctions) {
            rp = "f";
        }
        if (process.platform === 'win32') {
            os = "w";
        }
        else if (process.platform === 'linux') {
            os = "l";
        }
        return `${rp}${os}_`;
    }

}
