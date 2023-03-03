import { AgentLoader } from "./agentLoader";
import { DiagnosticLogger } from "./diagnostics/diagnosticLogger";
import { StatusLogger } from "./diagnostics/statusLogger";
import { AzureFunctionsWriter } from "./diagnostics/writers/azureFunctionsWriter";


export class AzureFunctionsLoader extends AgentLoader {

    constructor() {
        super();
        // Azure Fn specific configuration
        this._config.enableAutoCollectPerformance = false;
        this._config.enableAutoCollectStandardMetrics = false;
        
        const writer = new AzureFunctionsWriter(this._instrumentationKey);
        this._diagnosticLogger = new DiagnosticLogger(this._instrumentationKey, writer);
        this._statusLogger = new StatusLogger(this._instrumentationKey, writer)
    }
}
