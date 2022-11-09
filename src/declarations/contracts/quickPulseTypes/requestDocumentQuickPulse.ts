import { DocumentQuickPulse } from "./documentQuickPulse";

export interface RequestDocumentQuickPulse extends DocumentQuickPulse {
    Name: string;
    Success?: boolean;
    Duration: string;
    ResponseCode: string;
    OperationName: string;
}
