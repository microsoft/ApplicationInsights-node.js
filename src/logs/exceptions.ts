// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import { logs } from "@opentelemetry/api-logs";
import { Util } from "../shared/util";
import { LogApi } from "./api";
import { LoggerProvider } from "@opentelemetry/sdk-logs";

type ExceptionHandle = "uncaughtExceptionMonitor" | "uncaughtException" | "unhandledRejection";
const UNCAUGHT_EXCEPTION_MONITOR_HANDLER_NAME: ExceptionHandle = "uncaughtExceptionMonitor";
const UNCAUGHT_EXCEPTION_HANDLER_NAME: ExceptionHandle = "uncaughtException";
const UNHANDLED_REJECTION_HANDLER_NAME: ExceptionHandle = "unhandledRejection";
const FALLBACK_ERROR_MESSAGE =
    "A promise was rejected without providing an error. Application Insights generated this error stack for you.";

export class AutoCollectExceptions {
    private _canUseUncaughtExceptionMonitor = false;
    private _exceptionListenerHandle?: (error: Error | undefined) => void;
    private _rejectionListenerHandle?: (error: Error | undefined) => void;
    private _client: LogApi;

    constructor(client: LogApi) {
        this._client = client;
        // Only use for 13.7.0+
        const nodeVer = process.versions.node.split(".");
        this._canUseUncaughtExceptionMonitor =
            parseInt(nodeVer[0]) > 13 || (parseInt(nodeVer[0]) === 13 && parseInt(nodeVer[1]) >= 7);

        // For scenarios like Promise.reject(), an error won't be passed to the handle. Create a placeholder
        // error for these scenarios.
        if (this._canUseUncaughtExceptionMonitor) {
            // Node.js >= 13.7.0, use uncaughtExceptionMonitor. It handles both promises and exceptions
            this._exceptionListenerHandle = this._handleException.bind(
                this,
                false,
                UNCAUGHT_EXCEPTION_MONITOR_HANDLER_NAME
            ); // never rethrows
            (<any>process).on(
                UNCAUGHT_EXCEPTION_MONITOR_HANDLER_NAME,
                this._exceptionListenerHandle
            );
        } else {
            this._exceptionListenerHandle = this._handleException.bind(
                this,
                true,
                UNCAUGHT_EXCEPTION_HANDLER_NAME
            );
            this._rejectionListenerHandle = this._handleException.bind(
                this,
                false,
                UNHANDLED_REJECTION_HANDLER_NAME
            ); // never rethrows
            (<any>process).on(
                UNCAUGHT_EXCEPTION_HANDLER_NAME,
                this._exceptionListenerHandle
            );
            (<any>process).on(
                UNHANDLED_REJECTION_HANDLER_NAME,
                this._rejectionListenerHandle
            );
        }
    }

    public shutdown() {
        if (this._exceptionListenerHandle) {
            if (this._canUseUncaughtExceptionMonitor) {
                process.removeListener(
                    UNCAUGHT_EXCEPTION_MONITOR_HANDLER_NAME,
                    this._exceptionListenerHandle
                );
            } else {
                if (this._exceptionListenerHandle) {
                    process.removeListener(
                        UNCAUGHT_EXCEPTION_HANDLER_NAME,
                        this._exceptionListenerHandle
                    );
                }
                if (this._rejectionListenerHandle) {
                    process.removeListener(
                        UNHANDLED_REJECTION_HANDLER_NAME,
                        this._rejectionListenerHandle
                    );
                }
            }
            this._exceptionListenerHandle = undefined;
            this._rejectionListenerHandle = undefined;
            delete this._exceptionListenerHandle;
            delete this._rejectionListenerHandle;
        }
    }

    private _handleException(
        reThrow: boolean,
        name: ExceptionHandle,
        error: Error | undefined = new Error(FALLBACK_ERROR_MESSAGE)
    ) {
        if (this._client) {
            this._client.trackException({ exception: error });
            (logs.getLoggerProvider() as LoggerProvider).forceFlush();
            // only rethrow when we are the only listener
            if (reThrow && name && process.listeners(name as any).length === 1) {
                // eslint-disable-next-line no-console
                console.error(error);
                // eslint-disable-next-line no-process-exit
                process.exit(1);
            }
        } else {
            // eslint-disable-next-line no-console
            console.error(error);
            process.exit(1);
        }
    }
}


// regex to match stack frames from ie/chrome/ff
// methodName=$2, fileName=$4, lineNo=$5, column=$6
const stackFramesRegex = /^(\s+at)?(.*?)(\@|\s\(|\s)([^\(\n]+):(\d+):(\d+)(\)?)$/;

export class _StackFrame {
    public sizeInBytes = 0;
    public level: number;
    public method: string;
    public assembly: string;
    public fileName: string;
    public line: number;

    private _baseSize = 58; //'{"method":"","level":,"assembly":"","fileName":"","line":}'.length

    constructor(frame: string, level: number) {
        this.level = level;
        this.method = "<no_method>";
        this.assembly = Util.getInstance().trim(frame);
        const matches = frame.match(stackFramesRegex);
        if (matches && matches.length >= 5) {
            this.method = Util.getInstance().trim(matches[2]) || this.method;
            this.fileName = Util.getInstance().trim(matches[4]) || "<no_filename>";
            this.line = parseInt(matches[5]) || 0;
        }

        this.sizeInBytes += this.method.length;
        this.sizeInBytes += this.fileName.length;
        this.sizeInBytes += this.assembly.length;

        // todo: these might need to be removed depending on how the back-end settles on their size calculation
        this.sizeInBytes += this._baseSize;
        this.sizeInBytes += this.level.toString().length;
        this.sizeInBytes += this.line.toString().length;
    }
}

export function parseStack(stack: any): _StackFrame[] {
    let parsedStack: _StackFrame[] = undefined;
    if (typeof stack === "string") {
        const frames = stack.split("\n");
        parsedStack = [];
        let level = 0;

        let totalSizeInBytes = 0;
        for (let i = 0; i <= frames.length; i++) {
            const frame = frames[i];
            if (stackFramesRegex.test(frame)) {
                const parsedFrame = new _StackFrame(frames[i], level++);
                totalSizeInBytes += parsedFrame.sizeInBytes;
                parsedStack.push(parsedFrame);
            }
        }

        // DP Constraint - exception parsed stack must be < 32KB
        // remove frames from the middle to meet the threshold
        const exceptionParsedStackThreshold = 32 * 1024;
        if (totalSizeInBytes > exceptionParsedStackThreshold) {
            let left = 0;
            let right = parsedStack.length - 1;
            let size = 0;
            let acceptedLeft = left;
            let acceptedRight = right;

            while (left < right) {
                // check size
                const lSize = parsedStack[left].sizeInBytes;
                const rSize = parsedStack[right].sizeInBytes;
                size += lSize + rSize;

                if (size > exceptionParsedStackThreshold) {
                    // remove extra frames from the middle
                    const howMany = acceptedRight - acceptedLeft + 1;
                    parsedStack.splice(acceptedLeft, howMany);
                    break;
                }

                // update pointers
                acceptedLeft = left;
                acceptedRight = right;

                left++;
                right--;
            }
        }
    }

    return parsedStack;
}
