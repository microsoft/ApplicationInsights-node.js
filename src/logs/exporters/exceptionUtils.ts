// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Util } from "../../shared/util";

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
