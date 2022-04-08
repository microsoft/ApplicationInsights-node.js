// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Util } from "../../Util/Util";

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
    var matches = frame.match(stackFramesRegex);
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
  

  var parsedStack: _StackFrame[] = undefined;
  if (typeof stack === "string") {
    var frames = stack.split("\n");
    parsedStack = [];
    var level = 0;

    var totalSizeInBytes = 0;
    for (var i = 0; i <= frames.length; i++) {
      var frame = frames[i];
      if (stackFramesRegex.test(frame)) {
        var parsedFrame = new _StackFrame(frames[i], level++);
        totalSizeInBytes += parsedFrame.sizeInBytes;
        parsedStack.push(parsedFrame);
      }
    }

    // DP Constraint - exception parsed stack must be < 32KB
    // remove frames from the middle to meet the threshold
    var exceptionParsedStackThreshold = 32 * 1024;
    if (totalSizeInBytes > exceptionParsedStackThreshold) {
      var left = 0;
      var right = parsedStack.length - 1;
      var size = 0;
      var acceptedLeft = left;
      var acceptedRight = right;

      while (left < right) {
        // check size
        var lSize = parsedStack[left].sizeInBytes;
        var rSize = parsedStack[right].sizeInBytes;
        size += lSize + rSize;

        if (size > exceptionParsedStackThreshold) {

          // remove extra frames from the middle
          var howMany = acceptedRight - acceptedLeft + 1;
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