import { ManagedIdentityCredential } from "@azure/identity";
import { ApplicationInsightsClient } from "../applicationInsightsClient";
import { ApplicationInsightsConfig } from "../shared";
import { Util } from "../shared/util";
import { ConsoleWriter } from "./diagnostics/writers/consoleWriter";
import { DiagnosticLogger } from "./diagnostics/diagnosticLogger";
import { StatusLogger } from "./diagnostics/statusLogger";
import { DiagnosticMessageId, IDiagnosticLog, IDiagnosticLogger, NODE_JS_RUNTIME_MAJOR_VERSION } from "./types";


const forceStart = process.env.APPLICATIONINSIGHTS_FORCE_START === "true";

export class AgentLoader {
    private _canLoad: boolean;
    protected _config: ApplicationInsightsConfig;
    protected _instrumentationKey: string;
    protected _diagnosticLogger: IDiagnosticLogger;
    protected _statusLogger: StatusLogger;
    private _aadCredential: any; // Types not available as library should not be loaded in older versions of Node.js runtime

    constructor() {
        // Open Telemetry and AAD packages unsusable in older versions of Node.js runtime
        if (NODE_JS_RUNTIME_MAJOR_VERSION <= 8) {
            this._canLoad = false;
        }
        else {
            this._canLoad = true;
            this._aadCredential = this._getAuthenticationCredential();
            // Default config
            this._config = new ApplicationInsightsConfig();
            this._instrumentationKey = this._config.getInstrumentationKey();
            this._config.disableOfflineStorage = false;
            this._config.enableAutoCollectExceptions = true;
            this._config.enableAutoCollectHeartbeat = true;
            this._config.enableAutoCollectPerformance = true;
            this._config.enableAutoCollectStandardMetrics = true;
            this._config.samplingRate = 100;
            this._config.instrumentations.azureSdk.enabled = true;
            this._config.instrumentations.http.enabled = true;
            this._config.instrumentations.mongoDb.enabled = true;
            this._config.instrumentations.mySql.enabled = true;
            this._config.instrumentations.postgreSql.enabled = true;
            this._config.instrumentations.redis4.enabled = true;
            this._config.instrumentations.redis.enabled = true;
            this._config.logInstrumentations.bunyan.enabled = true;
            this._config.logInstrumentations.console.enabled = true;
            this._config.logInstrumentations.winston.enabled = true;

            //Default diagnostic using console
            this._diagnosticLogger = new DiagnosticLogger(this._instrumentationKey, new ConsoleWriter());
            this._statusLogger = new StatusLogger(this._instrumentationKey, new ConsoleWriter());
        }
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
                this._config.aadTokenCredential = this._aadCredential;
                const appInsightsClient = new ApplicationInsightsClient(this._config);
                appInsightsClient.start();

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
            if (!this._config.getInstrumentationKey()) {
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

}
