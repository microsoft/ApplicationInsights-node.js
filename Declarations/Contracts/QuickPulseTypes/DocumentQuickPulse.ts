export interface DocumentQuickPulse {
    __type: string;

    DocumentType: string;

    Version: string;

    OperationId: string;

    Properties: {[key: string]: string}[];
}
