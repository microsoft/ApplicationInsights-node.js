/// <reference path="..\node_modules\zone.js\dist\zone.js.d.ts" />
import http = require("http");
import Util = require("../Library/Util");

export interface CorrelationContext {
    operation: {
        name: string;
        id: string;
        parentId: string; // Always used for dependencies, may be ignored in favor of incoming headers for requests
    };
    customProperties: {};
}

export class CorrelationContextManager {
    private static enabled: boolean = false;
    private static hasEverEnabled: boolean = false;

    /** 
     *  Provides the current Context.
     *  The context is the most recent one entered into for the current
     *  logical chain of execution, including across asynchronous calls.
     */
    public static getCurrentContext(): CorrelationContext {
        if (!CorrelationContextManager.enabled) {
            return null;
        }
        return Zone.current.get("context");
    }

    /**
     *  A helper to generate objects conforming to the CorrelationContext interface
     */
    public static generateContextObject(parentId?: string, operationName?: string, operationId?: string): CorrelationContext {
        operationId = operationId || Util.newGuid();
        parentId = parentId || operationId;
        
        if (this.enabled) {
            return {
                operation: {
                    name: operationName,
                    id: operationId,
                    parentId: parentId
                },
                customProperties: {}
            };
        }

        return null;
    }

    /** 
     *  Runs a function inside a given Context.
     *  All logical children of the execution path that entered this Context
     *  will receive this Context object on calls to GetCurrentContext.
     */
    public static runWithContext(context: CorrelationContext, fn: ()=>any) {
        if (CorrelationContextManager.enabled) {
            var newZone = Zone.current.fork({
                name: "AI-" + ((context && context.operation.parentId) || "Unknown"), 
                properties: {context: context}
            });
            newZone.run(fn);
        } else {
            fn();
        }
    }

    /** 
     *  Patches a callback to restore the correct Context when getCurrentContext 
     *  is run within it. This is necessary if automatic correlation fails to work
     *  with user-included libraries.
     * 
     *  The supplied callback will be given the same context that was present for 
     *  the call to wrapCallback.  */
    public static wrapCallback<T extends Function>(fn: T): T {
        if (CorrelationContextManager.enabled) {
            return Zone.current.wrap(fn, "User-wrapped method");
        }
        return fn;
    }

    /**
     *  Enables the CorrelationContextManager.
     */
    public static enable() {
        if (!this.isNodeVersionCompatible()) {
            this.enabled = false;
            return;
        }

        // Load in Zone.js
        require("zone.js");
        

        // Run patches for Zone.js
        if (!this.hasEverEnabled) {
            this.hasEverEnabled = true;
            this.patchError();
            this.patchTimers(["setTimeout", "setInterval"]);
            this.patchRedis();
        }

        this.enabled = true;
    }

    /**
     *  Disables the CorrelationContextManager.
     */
    public static disable() {
        this.enabled = false;
    }


    /**
     *  Reports if the CorrelationContextManager is able to run in this environment
     */
    public static isNodeVersionCompatible() {
        // Unit tests warn of errors < 3.3 from timer patching. All versions before 4 were 0.x
        var nodeVer = process.versions.node.split(".");
        return parseInt(nodeVer[0]) > 3 || (parseInt(nodeVer[0]) > 2 && parseInt(nodeVer[1]) > 2);
    }

    // Patch methods that manually go async that Zone doesn't catch
    private static requireForPatch(module: string) {
        var req = null;
        try {
            req = require(module);
        } catch (e) {
            return null;
        }
        return req;
    }

    // A good example of patching a third party library to respect context.
    // send_command is always used in this library to send data out.
    // By overwriting the function to capture the callback provided to it,
    // and wrapping that callback, we ensure that consumers of this library
    // will have context persisted.
    private static patchRedis() {
        var redis = this.requireForPatch("redis");

        if (redis && redis.RedisClient) {
            var orig = redis.RedisClient.prototype.send_command;
            redis.RedisClient.prototype.send_command = function() {
                var args = Array.prototype.slice.call(arguments);
                var lastArg = args[args.length - 1];

                if (typeof lastArg === "function") {
                    args[args.length - 1] = Zone.current.wrap(lastArg, "AI.CCM.patchRedis");
                } else if (lastArg instanceof Array && typeof lastArg[lastArg.length - 1] === "function") {
                    // The last argument can be an array!
                    var lastIndexLastArg = lastArg[lastArg.length - 1];
                    lastArg[lastArg.length - 1] = Zone.current.wrap(lastIndexLastArg, "AI.CCM.patchRedis");
                }

                return orig.apply(this, args);
            };
        }
    }

    // Zone.js breaks concatenation of timer return values.
    // This fixes that.
    private static patchTimers(methodNames: string[]) {
        methodNames.forEach(methodName => {
            var orig = global[methodName];
            global[methodName] = function() {
                var ret = orig.apply(this, arguments);
                ret.toString = function(){
                    if (this.data && typeof this.data.handleId !== 'undefined') {
                        return this.data.handleId.toString();
                    } else {
                        return Object.prototype.toString.call(this);
                    }
                }
                return ret;
            };
        });
    }

    // Zone.js breaks deepEqual on error objects (by making internal properties enumerable).
    // This fixes that by subclassing the error object and making all properties not enumerable
    private static patchError() {
        var orig = global.Error;

        // New error handler
        function AppInsightsAsyncCorrelatedErrorWrapper() {
            if (!(this instanceof AppInsightsAsyncCorrelatedErrorWrapper)) {
                return AppInsightsAsyncCorrelatedErrorWrapper.apply(Object.create(AppInsightsAsyncCorrelatedErrorWrapper.prototype), arguments);
            }

            orig.apply(this, arguments);
            
            // getOwnPropertyNames should be a superset of Object.keys...
            // This appears to not always be the case
            var props = Object.getOwnPropertyNames(this).concat(Object.keys(this));

            // Zone.js will automatically create some hidden properties at read time.
            // We need to proactively make those not enumerable as well as the currently visible properties
            for(var i=0; i<props.length; i++) {
                var propertyName = props[i];
                var hiddenPropertyName = Zone['__symbol__'](propertyName);
                Object.defineProperty(this, propertyName, { enumerable: false });
                Object.defineProperty(this, hiddenPropertyName, { enumerable: false, writable: true });
            }

            return this;
        }

        // Inherit from the Zone.js error handler
        AppInsightsAsyncCorrelatedErrorWrapper.prototype = orig.prototype;

        // We need this loop to copy outer methods like Error.captureStackTrace
        var props = Object.getOwnPropertyNames(orig);
        for(var i=0; i<props.length; i++) {
            var propertyName = props[i];
            if (!AppInsightsAsyncCorrelatedErrorWrapper[propertyName]) {
                Object.defineProperty(AppInsightsAsyncCorrelatedErrorWrapper, propertyName, {
                    value: orig[propertyName],
                    enumerable: orig.propertyIsEnumerable(propertyName)
                });
            }
        }
        global.Error = AppInsightsAsyncCorrelatedErrorWrapper;
    }
}