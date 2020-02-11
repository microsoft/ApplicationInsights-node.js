export interface AgentLogger {
    log(message?: any, ...optional: any[]): void;
    error(message?: any, ...optional: any[]): void;
}
