import { DocumentQuickPulse } from "./documentQuickPulse";

export interface MessageDocumentQuickPulse extends DocumentQuickPulse {
    Message: string;
    SeverityLevel: string;
}
