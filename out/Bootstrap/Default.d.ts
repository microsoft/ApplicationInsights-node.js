import * as azureCoreAuth from "@azure/core-auth";
import * as types from "../applicationinsights";
import { StatusLogger } from "./StatusLogger";
import { DiagnosticLogger } from "./DiagnosticLogger";
import Config = require("../Library/Config");
export declare const defaultConfig: Config;
/**
 * Sets the attach-time logger
 * @param logger logger which implements the `AgentLogger` interface
 */
export declare function setLogger(logger: DiagnosticLogger): DiagnosticLogger;
/**
 * Sets the string which is prefixed to the existing sdkVersion, e.g. `ad_`, `alr_`
 * @param prefix string prefix, including underscore. Defaults to `ud_`
 */
export declare function setUsagePrefix(prefix: string): void;
export declare function setStatusLogger(statusLogger: StatusLogger): void;
/**
 * Try to setup and start this app insights instance if attach is enabled.
 * @param aadTokenCredential Optional AAD credential
 */
export declare function setupAndStart(aadTokenCredential?: azureCoreAuth.TokenCredential, isAzureFunction?: boolean): typeof types | null;
