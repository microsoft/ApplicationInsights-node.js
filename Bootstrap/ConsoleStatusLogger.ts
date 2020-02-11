import { StatusLogger, StatusContract } from "./StatusLogger";
import { AgentLogger } from "./DataModel";

export class ConsoleStatusLogger implements StatusLogger {
    public FULL_PATH: string;

    constructor(private _logger: AgentLogger = console) {
    }

    public isNodeVersionCompatible(): boolean {
        return true;
    }

    public makeStatusDirs(filepath?: string): string {
        // no op
        return null;
    }

    public writeFile(data: StatusContract, cb?: Function): void {
        this._logger.log(data);
        if (typeof cb === "function") {
            cb();
        }
    }

    public addCloseHandler(): void {
        // no op
    }
}
