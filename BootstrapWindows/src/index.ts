// Utility Functions for loading Application Insights IPA
import * as loader from 'applicationinsights/out/Bootstrap/Default';
import {DiagnosticLogger} from 'applicationinsights/out/Bootstrap/DiagnosticLogger';
import * as etwTypes from '@microsoft/typescript-etw';

export class ETWLogger extends DiagnosticLogger {
  constructor() {
    let writer;
    let etw: typeof etwTypes | undefined;
    try {
      etw = require('@microsoft/typescript-etw');
      writer = {
        log: (message: string) => {
          if (etw) etw.logInfoEvent(message);
        },
        error: (message: string) => {
          if (etw) etw.logErrEvent(message);
        },
      };
    } catch (e) {
      console.log('Could not load ETW. Defaulting to console logging', e);
      etw = undefined;
      writer = console;
    }
    super(writer);
  }

  logMessage(
    message: string,
    cb?: ((err: Error | null) => void) | undefined
  ): void {
    this._writer.log(message);
    if (cb) cb(null);
  }
  logError(
    message: string,
    cb?: ((err: Error | null) => void) | undefined
  ): void {
    this._writer.error(message);
    if (cb) cb(null);
  }
}

export function setupAndStart(setupString?: string) {
  return loader.setupAndStart(setupString);
}

export {
  setLogger,
  setStatusLogger,
  setUsagePrefix,
} from 'applicationinsights/out/Bootstrap/Default';
