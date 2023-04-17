import { DocumentQuickPulse } from "./DocumentQuickPulse";
import { MetricQuickPulse } from "./MetricQuickPulse";
export interface EnvelopeQuickPulse {
    Documents: DocumentQuickPulse[];
    Instance: string;
    RoleName: string;
    InstrumentationKey: string;
    InvariantVersion: number;
    MachineName: string;
    Metrics: MetricQuickPulse[];
    StreamId: string;
    Timestamp: string;
    Version: string;
}
