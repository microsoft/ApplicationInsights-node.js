// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from 'fs';
import * as path from 'path';
import { Util } from "../../../shared/util";
import { IAgentLogger } from "../../types";

export class EtwWriter implements IAgentLogger {
    private _etwModule: any;

    constructor() {
        const nodeMajVer = parseInt(process.versions.node.split('.')[0], 10);

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

    public log(message: string, optional?: string[]) {
        if(this._etwModule){
             // eslint-disable-next-line @typescript-eslint/ban-types
            (this._etwModule.logInfoEvent as Function)(message, ...optional);
        }
        else{
            console.log(Util.getInstance().stringify(message));
        }
    }

    public error(message: string, optional?: string[]) {
        if(this._etwModule){
            // eslint-disable-next-line @typescript-eslint/ban-types
            (this._etwModule.logErrEvent as Function)(message, ...optional);
        }
        else{
            console.error(Util.getInstance().stringify(message));
        }
    }

    private _loadEtwModule(nodeMajVer: number){
        // Try to load precompiled ETW module if it exists and is "importable"
        const dirname = path.join(__dirname, '../../../../../../../etw', `etw_${nodeMajVer}`);
        try {
          // throws an error if directory is not readable / does not exist
          fs.accessSync(dirname, fs.constants.R_OK);
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          return require(dirname);
        } catch (e) {
          // Could not load ETW, return nothing
          return undefined;
        }
      }
}
