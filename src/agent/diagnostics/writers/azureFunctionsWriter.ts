import { AZURE_MONITOR_DISTRO_VERSION } from "../../../declarations/constants";
import { AZURE_APP_NAME, IAgentLogger } from "../../types";

const AZURE_FUNCTIONS_DIAGNOSTIC_PREFIX = "LanguageWorkerConsoleLogMS_APPLICATION_INSIGHTS_LOGS";

export class AzureFunctionsWriter implements IAgentLogger {
    private _appName: string;
    private _instrumentationKey: string;
    private _agentVersion: string;

    constructor(instrumentationKey: string) {
        this._instrumentationKey = instrumentationKey;
        this._appName = AZURE_APP_NAME;
        this._agentVersion = AZURE_MONITOR_DISTRO_VERSION;
    }

    public log(log: any) {
        console.info(this._getAzureFnLog(log));
    }

    public error(log: any) {
        console.error(this._getAzureFnLog(log));
    }

    private _getAzureFnLog(log: any): string {
        const output = `${AZURE_FUNCTIONS_DIAGNOSTIC_PREFIX} ${log.time},${log.level},${log.logger},\"${log.message}\",${this._appName},${this._instrumentationKey},${this._agentVersion},node.js`;
        return output;
    }
}
