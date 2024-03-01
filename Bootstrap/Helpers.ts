import { isLinux } from "../Library/PrefixHelper";
import { DiagnosticLog, DiagnosticMessageId } from "./DataModel";
import { DiagnosticLogger } from "./DiagnosticLogger";

const LINUX_USER_APPLICATION_INSIGHTS_PATH = "/node_modules/applicationinsights/out/applicationinsights.js";

export function sdkAlreadyExists(_logger: DiagnosticLogger): boolean {
    try {
        // appInstance should either resolve to user SDK or crash. If it resolves to attach SDK, user probably modified their NODE_PATH
        let appInstance: string;
        try {
            // Node 8.9+
            appInstance = (require.resolve as any)("applicationinsights", { paths: [process.cwd()] });
        } catch (e) {
            // Node <8.9
            appInstance = require.resolve(process.cwd() + "/node_modules/applicationinsights");
        }
        /** 
         * If loaded instance is in Azure machine home path do not attach the SDK, this means customer already instrumented their app.
         * Linux App Service doesn't append the full cwd to the require.resolve, so we need to check for the relative path we expect
         * if application insights is being imported in the user app code.
        */
        if (
            appInstance.indexOf("home") > -1 ||
            (appInstance === LINUX_USER_APPLICATION_INSIGHTS_PATH && isLinux())
        ) {
            const diagnosticLog: DiagnosticLog = {
                message: "Application Insights SDK already exists. Module is already installed in this application; not re-attaching. Installed SDK location: " + appInstance,
                properties: {
                    "msgId": DiagnosticMessageId.sdkExists
                }
            };
            _logger.logError(diagnosticLog);
            return true;
        }
        else {
            // ApplicationInsights could be loaded outside of customer application, attach in this case
            return false;
        }
    } catch (e) {
        // crashed while trying to resolve "applicationinsights", so SDK does not exist. Attach appinsights
        return false;
    }
}