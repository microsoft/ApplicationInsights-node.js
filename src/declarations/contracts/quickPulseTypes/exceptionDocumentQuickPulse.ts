import { DocumentQuickPulse } from "./documentQuickPulse";

export interface ExceptionDocumentQuickPulse extends DocumentQuickPulse {
    Exception: string;
    ExceptionMessage: string;
    ExceptionType: string;
}
