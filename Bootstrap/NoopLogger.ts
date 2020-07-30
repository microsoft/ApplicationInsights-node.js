import * as DataModel from "./DataModel";
import { FileWriter } from "./FileWriter";

export class NoopLogger implements DataModel.AgentLogger {
    log(message?: any, ...optional: any[]): void {
    }
    error(message?: any, ...optional: any[]): void {
    }
}
