import { DocumentQuickPulse } from "./documentQuickPulse";

export interface DependencyDocumentQuickPulse extends DocumentQuickPulse {
  Name: string;
  Target: string;
  Success?: boolean;
  Duration: string;
  ResultCode: string;
  CommandName: string;
  DependencyTypeName: string;
  OperationName: string;
}
