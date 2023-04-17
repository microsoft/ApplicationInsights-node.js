import * as DataModel from "./DataModel";
export declare class NoopLogger implements DataModel.AgentLogger {
    log(message?: any, ...optional: any[]): void;
    error(message?: any, ...optional: any[]): void;
}
