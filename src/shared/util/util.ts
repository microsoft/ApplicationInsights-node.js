// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { diag } from "@opentelemetry/api";


export class Util {
    private static _instance: Util;
    private _listenerAttached = false;

    public isNodeExit = false;

    static getInstance() {
        if (!Util._instance) {
            Util._instance = new Util();
        }
        return Util._instance;
    }

    public constructor() {
        this._addCloseHandler();
    }

    /**
     * helper method to trim strings (IE8 does not implement String.prototype.trim)
     */
    public trim(str: string): string {
        if (typeof str === "string") {
            return str.replace(/^\s+|\s+$/g, "");
        }
        return "";
    }

    /**
     * Check if an object is of type Array
     */
    public isArray(obj: any): boolean {
        return Object.prototype.toString.call(obj) === "[object Array]";
    }

    /**
     * Check if an object is of type Error
     */
    public isError(obj: any): boolean {
        return obj instanceof Error;
    }

    public isPrimitive(input: any): boolean {
        const propType = typeof input;
        return propType === "string" || propType === "number" || propType === "boolean";
    }

    /**
     * Check if an object is of type Date
     */
    public isDate(obj: any): boolean {
        return Object.prototype.toString.call(obj) === "[object Date]";
    }

    /**
     * Convert milliseconds to Breeze expected time.
     * @internal
     */
    public msToTimeSpan(ms: number): string {
        let totalms = ms;
        if (Number.isNaN(totalms) || totalms < 0 || !Number.isFinite(ms)) {
            totalms = 0;
        }

        let sec = ((totalms / 1000) % 60).toFixed(7).replace(/0{0,4}$/, "");
        let min = `${Math.floor(totalms / (1000 * 60)) % 60}`;
        let hour = `${Math.floor(totalms / (1000 * 60 * 60)) % 24}`;
        const days = Math.floor(totalms / (1000 * 60 * 60 * 24));

        sec = sec.indexOf(".") < 2 ? `0${sec}` : sec;
        min = min.length < 2 ? `0${min}` : min;
        hour = hour.length < 2 ? `0${hour}` : hour;
        const daysText = days > 0 ? `${days}.` : "";

        return `${daysText + hour}:${min}:${sec}`;
    }

    /**
     * Using JSON.stringify, by default Errors do not serialize to something useful:
     * Simplify a generic Node Error into a simpler map for customDimensions
     * Custom errors can still implement toJSON to override this functionality
     */
    protected extractError(err: Error): { message: string; code: string } {
        // Error is often subclassed so may have code OR id properties:
        // https://nodejs.org/api/errors.html#errors_error_code
        const looseError = err as any;
        return {
            message: err.message,
            code: looseError.code || looseError.id || "",
        };
    }

    public isDbDependency(dependencyType: string) {
        return (
            dependencyType.indexOf("SQL") > -1 ||
            dependencyType === "mysql" ||
            dependencyType === "postgresql" ||
            dependencyType === "mongodb" ||
            dependencyType === "redis"
        );
    }

    /**
     * Returns string representation of an object suitable for diagnostics diag.
     */
    public dumpObj(object: any): string {
        const objectTypeDump: string = Object["prototype"].toString.call(object);
        let propertyValueDump = "";
        if (objectTypeDump === "[object Error]") {
            propertyValueDump = `{ stack: '${object.stack}', message: '${object.message}', name: '${object.name}'`;
        } else {
            propertyValueDump = JSON.stringify(object);
        }

        return objectTypeDump + propertyValueDump;
    }

    public stringify(payload: any) {
        try {
            return JSON.stringify(payload);
        } catch (error) {
            diag.warn("Failed to serialize payload", error, payload);
        }
    }

    private _addCloseHandler() {
        if (!this._listenerAttached) {
            process.on("exit", () => {
                this.isNodeExit = true;
            });
            this._listenerAttached = true;
        }
    }
}
