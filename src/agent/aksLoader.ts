import { ApplicationInsightsConfig } from "../shared";
import { ConsoleWriter } from "./diagnostics/consoleWriter";
import { DiagnosticLogger } from './diagnostics/diagnosticLogger';
import { StatusLogger } from "./diagnostics/statusLogger";
import { AgentLoader } from "./agentLoader";
import { IDiagnosticLogger } from "./types";


class AKSLoader {
    private _config: ApplicationInsightsConfig;
    private _diagnosticLogger: IDiagnosticLogger;
    private _statusLogger: StatusLogger;

    constructor() {
        this._config = new ApplicationInsightsConfig();
        const instrumentationKey = this._config.getInstrumentationKey();
        this._statusLogger = new StatusLogger(instrumentationKey, new ConsoleWriter());
        this._diagnosticLogger = new DiagnosticLogger(
            instrumentationKey,
            new ConsoleWriter(),
        );
    }

    public initialize(): void {
        const agentLoader = new AgentLoader(this._statusLogger, this._diagnosticLogger, this._config);
        agentLoader.initialize();
    }
}

const loader = new AKSLoader();
loader.initialize();
export = loader;
