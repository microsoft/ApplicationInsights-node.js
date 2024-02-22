import { DiagnosticLog, DiagnosticMessageId } from "./DataModel";
import { DiagnosticLogger } from "./DiagnosticLogger";

const USER_APP_PATH = "/home/site/wwwroot";

export function sdkAlreadyExists(_logger: DiagnosticLogger): boolean {
    try {
        // appInstance should either resolve to user SDK or crash. If it resolves to attach SDK, user probably modified their NODE_PATH
        let appInstance: string;
        try {
            // Node 8.9+
            // If we find the applicationinsights module under in the user application path, do not attach the SDK
            // In order for this to work in Windows, we need to pass the full "/home/site/wwwroot" path to require.resolve
            appInstance = (require.resolve as any)("applicationinsights", { paths: [USER_APP_PATH] });
            if (appInstance) {
                diagnosticLogSdkExists(_logger, appInstance);
                return true;
            }
        } catch (e) {
            // Node <8.9
            appInstance = require.resolve(process.cwd() + "/node_modules/applicationinsights");
            // If loaded instance is in Azure machine home path do not attach the SDK, this means customer already instrumented their app
            if (appInstance.indexOf("home") > -1) {
                diagnosticLogSdkExists(_logger, appInstance);
                return true;
            }
            else {
                // ApplicationInsights could be loaded outside of customer application, attach in this case
                return false;
            }
        }
    } catch (e) {
        // crashed while trying to resolve "applicationinsights", so SDK does not exist. Attach appinsights
        return false;
    }
}

function diagnosticLogSdkExists(logger: DiagnosticLogger, appInstance: string): void {
    const diagnosticLog: DiagnosticLog = {
        message: "Application Insights SDK already exists. Module is already installed in this application; not re-attaching. Installed SDK location: " + appInstance,
        properties: {
            "msgId": DiagnosticMessageId.sdkExists
        }
    };
    logger.logError(diagnosticLog);
}
