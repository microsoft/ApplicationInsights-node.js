import * as fs from 'fs';
import * as path from 'path';
import type * as etwTypes from '@microsoft/typescript-etw';
import { BaseDiagnosticLogger } from './baseDiagnosticLogger';
import { IDiagnosticLog, NODE_JS_RUNTIME_MAJOR_VERSION } from '../types';


export class EtwDiagnosticLogger extends BaseDiagnosticLogger {
    constructor(instrumentationKey: string) {
        super(instrumentationKey);
        let etwModule: typeof etwTypes | undefined;
        try {
            etwModule = this._loadEtwModule(NODE_JS_RUNTIME_MAJOR_VERSION);
            if (etwModule) {
                this._agentLogger = {
                    log: (message: any, params: any[]) => {
                        (etwModule.logInfoEvent as Function)(message, ...params);
                    },
                    error: (message: any, params: any[]) => {
                        (etwModule.logErrEvent as Function)(message, ...params);
                    },
                };
                console.log('AppInsightsAgent: Successfully loaded ETW');
            } else {
                console.log('AppInsightsAgent: ETW could not be loaded');
                this._agentLogger = console;
            }
        } catch (e) {
            console.log('Could not load ETW. Defaulting to console logging', e);
            etwModule = undefined;
            this._agentLogger = console;
        }

    }

    public logMessage(diagnosticLog: IDiagnosticLog): void {
        try {
            console.log('AppInsightsAgent ETWLogger', diagnosticLog.message);
            let metaData = this._getMetadata();
            metaData.push(diagnosticLog.messageId || "");
            let message: string = diagnosticLog.message;
            this._agentLogger.log(message, metaData);
        }
        catch (ex) {
            console.error("Failed to log Message in ETW", ex);
        }
    }

    private _loadEtwModule(nodeMajVer: number): typeof etwTypes | undefined {
        // Try to load precompiled ETW module if it exists and is "importable"
        const dirname = path.join(__dirname, '../etw', `etw_${nodeMajVer}`);
        try {
            // throws an error if directory is not readable / does not exist
            fs.accessSync(dirname, fs.constants.R_OK);
            return require(dirname) as typeof etwTypes;
        } catch (e) {
            // Could not load ETW, return nothing
            return undefined;
        }
    }

    private _getMetadata(): [string, string, string, string, string] {
        // Must return strings in this exact order!
        return [this._extensionVersion, this._subscriptionId, this._siteName, this._sdkVersion, this._instrumentationKey];
    }
}