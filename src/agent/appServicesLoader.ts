import * as os from 'os';
import * as path from 'path';
import { ApplicationInsightsConfig } from "../shared";
import { DiagnosticLogger } from './diagnostics/diagnosticLogger';
import { EtwDiagnosticLogger } from "./diagnostics/etwDiagnosticLogger";
import { FileWriter } from "./diagnostics/fileWriter";
import { StatusLogger } from "./diagnostics/statusLogger";
import { AgentLoader } from "./agentLoader";
import { IDiagnosticLogger } from "./types";


export class AppServicesLoader {
    private _config: ApplicationInsightsConfig;
    private _diagnosticLogger: IDiagnosticLogger;
    private _statusLogger: StatusLogger;
    private _loader: AgentLoader;

    constructor() {
        this._config = new ApplicationInsightsConfig();
        const instrumentationKey = this._config.getInstrumentationKey();
        const isWindows = process.platform === 'win32';
        let statusLogDir = '/var/log/applicationinsights/';
        if (isWindows) {
            if (process.env.HOME) {
                statusLogDir = path.join(process.env.HOME, "LogFiles", "ApplicationInsights", "status");;
            }
            else {
                statusLogDir = path.join(os.tmpdir(), "Microsoft", "ApplicationInsights", "StatusMonitor", "LogFiles", "ApplicationInsights", "status");
            }
        }
        this._statusLogger = new StatusLogger(instrumentationKey, new FileWriter(statusLogDir, 'status_nodejs.json', {
            append: false,
            deleteOnExit: false,
            renamePolicy: 'overwrite',
            sizeLimit: 1024 * 1024,
        }));

        if (isWindows) {
            let etwLogger = new EtwDiagnosticLogger(instrumentationKey);
            if (etwLogger.isLoaded()) {
                this._diagnosticLogger = etwLogger;
            }
        }

        if (!this._diagnosticLogger) {
            this._diagnosticLogger = new DiagnosticLogger(
                instrumentationKey,
                new FileWriter(
                    statusLogDir,
                    'applicationinsights-extension.log',
                    {
                        append: true,
                        deleteOnExit: false,
                        renamePolicy: 'overwrite',
                        sizeLimit: 1024 * 1024, // 1 MB
                    }
                )
            );
        }
        this._loader = new AgentLoader(this._statusLogger, this._diagnosticLogger, this._config);
    }

    public initialize(): void {
        this._loader.initialize();
    }
}
