import { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { DependencyTelemetry, Identified, RequestTelemetry } from "../../../Declarations/Contracts";
/**
 * Implementation of Mapping to Azure Monitor
 *
 * https://gist.github.com/lmolkova/e4215c0f44a49ef824983382762e6b92#file-z_azure_monitor_exporter_mapping-md
 */
export declare const parseEventHubSpan: (span: ReadableSpan, telemetry: (DependencyTelemetry | RequestTelemetry) & Identified) => void;
