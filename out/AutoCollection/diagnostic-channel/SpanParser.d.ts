import { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import * as Contracts from "../../Declarations/Contracts";
export declare function spanToTelemetryContract(span: ReadableSpan): (Contracts.DependencyTelemetry | Contracts.RequestTelemetry) & Contracts.Identified;
