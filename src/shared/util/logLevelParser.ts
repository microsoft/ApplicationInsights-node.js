import { SeverityNumber } from "@opentelemetry/api-logs";

export function logLevelParser(level: string): number {
    switch (level) {
        case "ERROR":
            return SeverityNumber.ERROR;
        case "WARN":
            return SeverityNumber.WARN;
        case "INFO":
            return SeverityNumber.INFO;
        default:
            return SeverityNumber.UNSPECIFIED;
    }
}