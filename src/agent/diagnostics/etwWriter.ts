import type * as etwTypes from '@microsoft/typescript-etw';
import { IAgentLogger } from "../types";


export class EtwWriter implements IAgentLogger {
    log(message: any, params: any[]) {
        let etwModule: typeof etwTypes | undefined;
        (etwModule.logInfoEvent as Function)(message, ...params);
    }

    error(message: any, params: any[]) {
        let etwModule: typeof etwTypes | undefined;
        (etwModule.logErrEvent as Function)(message, ...params);
    }
}
