import { ApplicationInsightsConfig } from "../shared";
import { ConsoleWriter } from "./diagnostics/consoleWriter";
import { DiagnosticLogger } from './diagnostics/diagnosticLogger';
import { StatusLogger } from "./diagnostics/statusLogger";
import { AgentLoader } from "./agentLoader";
import { IDiagnosticLogger } from "./types";


export class AzureFunctionsLoader {
    private _config: ApplicationInsightsConfig;
    private _diagnosticLogger: IDiagnosticLogger;
    private _statusLogger: StatusLogger;
    private _loader: AgentLoader;

    constructor() {
        this._config = new ApplicationInsightsConfig();
        const instrumentationKey = this._config.getInstrumentationKey();
        this._statusLogger = new StatusLogger(instrumentationKey, new ConsoleWriter());
        this._diagnosticLogger = new DiagnosticLogger(
            instrumentationKey,
            new ConsoleWriter(),
        );
        this._loader= new AgentLoader(this._statusLogger, this._diagnosticLogger, this._config);
    }

    public initialize(): void {
        // Azure Fn specific configuration
        this._config.enableAutoCollectPerformance = false;
        this._config.enableAutoCollectStandardMetrics = false;
        const agentLoader = new AgentLoader(this._statusLogger, this._diagnosticLogger, this._config);
        this._loader.initialize();
    }
}
