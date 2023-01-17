import type * as etwTypes from '@microsoft/typescript-etw';
import { IAgentLogger } from "../types";


export class EtwWriter implements IAgentLogger {
    log(message: any, params: any[]) {
        let etwModule: typeof etwTypes | undefined;
        (etwModule.logInfoEvent as (msg: any, ...params: any[]) => void)(message, ...params);
    }
}
