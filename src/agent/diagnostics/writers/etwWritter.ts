// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from 'fs';
import * as path from 'path';
import type * as etwTypes from '@microsoft/typescript-etw';
import { Util } from "../../../shared/util";
import { IAgentLogger } from "../../types";

export class EtwWritter implements IAgentLogger {
    private _etwModule: typeof etwTypes | undefined;

    constructor() {
        let nodeMajVer = parseInt(process.versions.node.split('.')[0], 10);

        try {
            this._etwModule = this._loadEtwModule(nodeMajVer);
            if (this._etwModule) {
              console.log('AppInsightsAgent: Successfully loaded ETW');
            } else {
              console.log('AppInsightsAgent: ETW could not be loaded');
            }
          } catch (e) {
            console.log('Could not load ETW. Defaulting to console logging', e);
            this._etwModule = undefined;
          }
    }

    public log(message?: any, ...optional: any[]) {
        if(this._etwModule){
            (this._etwModule.logInfoEvent as Function)(message, ...optional);
        }
        else{
            console.log(Util.getInstance().stringify(message));
        }
    }

    public error(message?: any, ...optional: any[]) {
        if(this._etwModule){
            (this._etwModule.logErrEvent as Function)(message, ...optional);
        }
        else{
            console.error(Util.getInstance().stringify(message));
        }
    }

    private _loadEtwModule(nodeMajVer: number): typeof etwTypes | undefined {
        // Try to load precompiled ETW module if it exists and is "importable"
        const dirname = path.join(__dirname, '../../../../../../../etw', `etw_${nodeMajVer}`);
        try {
          // throws an error if directory is not readable / does not exist
          fs.accessSync(dirname, fs.constants.R_OK);
          return require(dirname) as typeof etwTypes;
        } catch (e) {
          // Could not load ETW, return nothing
          return undefined;
        }
      }
}
