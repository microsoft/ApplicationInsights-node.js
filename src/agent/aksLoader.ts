import * as os from 'os';
import * as path from 'path';
import { DiagnosticLogger } from './diagnostics/diagnosticLogger';
import { FileWriter } from "./diagnostics/writers/fileWriter";
import { StatusLogger } from "./diagnostics/statusLogger";
import { AgentLoader } from "./agentLoader";


export class AKSLoader extends AgentLoader {

    constructor() {
        super();
        const isWindows = process.platform === 'win32';
        let statusLogDir = '/var/log/applicationinsights/';
        if (isWindows) {
            if (process.env.HOME) {
                statusLogDir = path.join(process.env.HOME, "LogFiles", "ApplicationInsights", "status");
            }
            else {
                statusLogDir = path.join(os.tmpdir(), "Microsoft", "ApplicationInsights", "StatusMonitor", "LogFiles", "ApplicationInsights", "status");
            }
        }
        this._statusLogger = new StatusLogger(this._instrumentationKey, new FileWriter(statusLogDir, 'status_nodejs.json', {
            append: false,
            deleteOnExit: false,
            renamePolicy: 'overwrite',
            sizeLimit: 1024 * 1024,
        }));

        this._diagnosticLogger = new DiagnosticLogger(
            this._instrumentationKey,
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
}
