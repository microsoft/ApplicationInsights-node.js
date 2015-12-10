///<reference path="..\Declarations\node\node.d.ts" />

import http = require("http");

import ContractsModule = require("../Library/Contracts");
import Client = require("../Library/Client");
import Sender = require("../Library/Sender");
import Queue = require("../Library/Channel");
import Util = require("../Library/Util");

class AutoCollectExceptions {

    public static INSTANCE: AutoCollectExceptions = null;

    private _exceptionListenerHandle;
    private _client: Client;
    private _isInitialized: boolean;

    constructor(client: Client) {
        if(!!AutoCollectExceptions.INSTANCE) {
            throw new Error("Exception tracking should be configured from the applicationInsights object");
        }

        AutoCollectExceptions.INSTANCE = this;
        this._client = client;
    }

    public isInitialized() {
        return this._isInitialized;
    }

    public enable(isEnabled: boolean) {
        if(isEnabled) {
            this._isInitialized = true;
            var self = this;
            if (!this._exceptionListenerHandle) {
                this._exceptionListenerHandle = (error:Error) => {
                    var data = AutoCollectExceptions.getExceptionData(error, false);
                    var envelope = this._client.getEnvelope(data);
                    this._client.channel.handleCrash(envelope);
                    throw error;
                };

                process.on("uncaughtException", this._exceptionListenerHandle);
                process.on("unhandledRejection", this._exceptionListenerHandle);
            }

        } else {
            if (this._exceptionListenerHandle) {
                process.removeListener("uncaughtException", this._exceptionListenerHandle);
                process.removeListener("unhandledRejection", this._exceptionListenerHandle);
                this._exceptionListenerHandle = undefined;
                delete this._exceptionListenerHandle;
            }
        }
    }

    /**
     * Track an exception
     * @param error the exception to track
     * @param handledAt where this exception was handled (leave null for unhandled)
     * @param properties additional properties
     */
    public static getExceptionData(error: Error, isHandled: boolean, properties?:{ [key: string]: string; }) {

        var exception = new ContractsModule.Contracts.ExceptionData();
        exception.handledAt = isHandled ? "User" : "Unhandled";
        exception.properties = properties;
        exception.severityLevel = ContractsModule.Contracts.SeverityLevel.Error;
        exception.properties = properties;
        exception.exceptions = [];

        var stack = error["stack"];
        var exceptionDetails = new ContractsModule.Contracts.ExceptionDetails();
        exceptionDetails.message = error.message;
        exceptionDetails.typeName = error.name;
        exceptionDetails.parsedStack = this.parseStack(stack);
        exceptionDetails.hasFullStack = Util.isArray(exceptionDetails.parsedStack) && exceptionDetails.parsedStack.length > 0;
        exception.exceptions.push(exceptionDetails);

        var data = new ContractsModule.Contracts.Data<ContractsModule.Contracts.ExceptionData>();
        data.baseType = "Microsoft.ApplicationInsights.ExceptionData";
        data.baseData = exception;
        return data;
    }

    private static parseStack(stack): _StackFrame[] {
        var parsedStack: _StackFrame[] = undefined;
        if (typeof stack === "string") {
            var frames = stack.split("\n");
            parsedStack = [];
            var level = 0;

            var totalSizeInBytes = 0;
            for (var i = 0; i <= frames.length; i++) {
                var frame = frames[i];
                if (_StackFrame.regex.test(frame)) {
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

    public dispose() {
        AutoCollectExceptions.INSTANCE = null;
        this._isInitialized = false;
    }
}

class _StackFrame {

    // regex to match stack frames from ie/chrome/ff
    // methodName=$2, fileName=$4, lineNo=$5, column=$6
    public static regex = /^([\s]+at)?(.*?)(\@|\s\(|\s)([^\(\@\n]+):([0-9]+):([0-9]+)(\)?)$/;
    public static baseSize = 58; //'{"method":"","level":,"assembly":"","fileName":"","line":}'.length
    public sizeInBytes = 0;
    public level;
    public method;
    public assembly;
    public fileName;
    public line;

    constructor(frame: string, level: number) {
        this.level = level;
        this.method = "unavailable";
        this.assembly = Util.trim(frame);
        var matches = frame.match(_StackFrame.regex);
        if (matches && matches.length >= 5) {
            this.method = Util.trim(matches[2]);
            this.fileName = Util.trim(matches[4]);
            this.line = parseInt(matches[5]) || 0;
        }

        this.sizeInBytes += this.method.length;
        this.sizeInBytes += this.fileName.length;
        this.sizeInBytes += this.assembly.length;

        // todo: these might need to be removed depending on how the back-end settles on their size calculation
        this.sizeInBytes += _StackFrame.baseSize;
        this.sizeInBytes += this.level.toString().length;
        this.sizeInBytes += this.line.toString().length;
    }
}

export = AutoCollectExceptions;
