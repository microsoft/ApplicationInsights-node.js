import http = require("http");
import Util = require("../Library/Util");
import Logging = require("../Library/Logging");

import * as DiagChannel from "./diagnostic-channel/initialization";
import { createNamespace, reset } from "cls-hooked";
import HttpRequestParser = require("./HttpRequestParser");
import TelemetryClient = require("../Library/TelemetryClient");

export interface CustomProperties {
    /**
     * Get a custom property from the correlation context
     */
    getProperty(key: string): string;
    /**
     * Store a custom property in the correlation context.
     * Do not store sensitive information here.
     * Properties stored here are exposed via outgoing HTTP headers for correlating data cross-component.
     * The characters ',' and '=' are disallowed within keys or values.
     */
    setProperty(key: string, value: string): void;
}

export interface PrivateCustomProperties extends CustomProperties {
    addHeaderData(header: string): void;
    serializeToHeader(): string;
}

export interface CorrelationContext {
    operation: {
        name: string;
        id: string;
        parentId: string; // Always used for dependencies, may be ignored in favor of incoming headers for requests
    };

    /** Do not store sensitive information here.
     *  Properties here are exposed via outgoing HTTP headers for correlating data cross-component.
     */
    customProperties: CustomProperties
}

export class CorrelationContextManager {
    private static enabled: boolean = false;
    private static hasEverEnabled: boolean = false;
    private static session = createNamespace('session');

    /**
     *  Provides the current Context.
     *  The context is the most recent one entered into for the current
     *  logical chain of execution, including across asynchronous calls.
     */
    public static getCurrentContext(): CorrelationContext {
        if (!CorrelationContextManager.enabled) {
            return null;
        }
        const context = CorrelationContextManager.session.get('context');

        if (context === undefined) { // cast undefined to null
            return null;
        }
        return context;
    }

    /**
     *  A helper to generate objects conforming to the CorrelationContext interface
     */
    public static generateContextObject(operationId: string, parentId?: string, operationName?: string, correlationContextHeader?: string): CorrelationContext {
        parentId = parentId || operationId;

        if (this.enabled) {
            return {
                operation: {
                    name: operationName,
                    id: operationId,
                    parentId: parentId
                },
                customProperties: new CustomPropertiesImpl(correlationContextHeader)
            };
        }

        return null;
    }

    /**
     *  Runs a function inside a given Context.
     *  All logical children of the execution path that entered this Context
     *  will receive this Context object on calls to GetCurrentContext.
     */
    public static runWithContext(context: CorrelationContext, fn: ()=>any): any {
        if (CorrelationContextManager.enabled) {
            return CorrelationContextManager.session.bind(fn, {context: context})();
        } else {
            return fn();
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
            return CorrelationContextManager.session.bind(fn);
        }
        return fn;
    }

    /**
     *  Enables the CorrelationContextManager.
     */
    public static enable() {
        if (this.enabled) {
            return;
        }

        if (!this.isNodeVersionCompatible()) {
            this.enabled = false;
            return;
        }

        if (!CorrelationContextManager.hasEverEnabled) {
            this.hasEverEnabled = true;

            try {
                if (typeof createNamespace === "undefined") {
                    require('cls-hooked');
                }
            } catch (e) {
                // cls-hooked was already loaded even though we couldn't find its global variable
                Logging.warn("Failed to require cls-hooked");
            }

            DiagChannel.registerContextPreservation((cb) => {
                return CorrelationContextManager.session.bind(cb);
            });
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
     * Resets the CorrelationContextManager
     */
    public static reset() {
        if (CorrelationContextManager.session.active) {
          CorrelationContextManager.session.set("context", null);
          reset();
        }
    }

    /**
     *  Reports if the CorrelationContextManager is able to run in this environment
     */
    public static isNodeVersionCompatible() {
        // Unit tests warn of errors < 3.3 from timer patching. All versions before 4 were 0.x
        var nodeVer = process.versions.node.split(".");
        return parseInt(nodeVer[0]) > 3 || (parseInt(nodeVer[0]) > 2 && parseInt(nodeVer[1]) > 2);
    }
}

class CustomPropertiesImpl implements PrivateCustomProperties {
    private static bannedCharacters = /[,=]/;
    private props: {key: string, value:string}[] = [];

    public constructor(header: string) {
        this.addHeaderData(header);
    }

    public addHeaderData(header?: string) {
        const keyvals = header ? header.split(", ") : [];
        this.props = keyvals.map((keyval) => {
            const parts = keyval.split("=");
            return {key: parts[0], value: parts[1]};
        }).concat(this.props);
    }

    public serializeToHeader() {
        return this.props.map((keyval) => {
            return `${keyval.key}=${keyval.value}`
        }).join(", ");
    }

    public getProperty(prop: string) {
        for(let i = 0; i < this.props.length; ++i) {
            const keyval = this.props[i]
            if (keyval.key === prop) {
                return keyval.value;
            }
        }
        return;
    }

    // TODO: Strictly according to the spec, properties which are recieved from
    // an incoming request should be left untouched, while we may add our own new
    // properties. The logic here will need to change to track that.
    public setProperty(prop: string, val: string) {
        if (CustomPropertiesImpl.bannedCharacters.test(prop) || CustomPropertiesImpl.bannedCharacters.test(val)) {
            Logging.warn("Correlation context property keys and values must not contain ',' or '='. setProperty was called with key: " + prop + " and value: "+ val);
            return;
        }
        for (let i = 0; i < this.props.length; ++i) {
            const keyval = this.props[i];
            if (keyval.key === prop) {
                keyval.value = val;
                return;
            }
        }
        this.props.push({key: prop, value: val});
    }
}
