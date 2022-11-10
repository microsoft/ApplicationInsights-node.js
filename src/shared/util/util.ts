import * as http from "http";
import * as https from "https";
import * as url from "url";
import * as constants from "constants";

import { context, isValidTraceId } from "@opentelemetry/api";
import { suppressTracing } from "@opentelemetry/core";
import { IdGenerator, RandomIdGenerator } from "@opentelemetry/sdk-trace-base";

import { Logger } from "../logging";
import { ApplicationInsightsConfig } from "../configuration";

export class Util {
    private static _instance: Util;
    private readonly _idGenerator: IdGenerator;
    private _listenerAttached = false;

    public MAX_PROPERTY_LENGTH = 8192;
    public keepAliveAgent: http.Agent = new https.Agent(<any>{
        keepAlive: true,
        maxSockets: 25,
        secureOptions:
            constants.SSL_OP_NO_SSLv2 |
            constants.SSL_OP_NO_SSLv3 |
            constants.SSL_OP_NO_TLSv1 |
            constants.SSL_OP_NO_TLSv1_1,
    });
    public tlsRestrictedAgent: http.Agent = new https.Agent(<any>{
        secureOptions:
            constants.SSL_OP_NO_SSLv2 |
            constants.SSL_OP_NO_SSLv3 |
            constants.SSL_OP_NO_TLSv1 |
            constants.SSL_OP_NO_TLSv1_1,
    });
    public isNodeExit = false;

    static getInstance() {
        if (!Util._instance) {
            Util._instance = new Util();
        }
        return Util._instance;
    }

    public constructor() {
        this._idGenerator = new RandomIdGenerator();
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
     * generate W3C-compatible trace id
     * https://github.com/w3c/distributed-tracing/blob/master/trace_context/HTTP_HEADER_FORMAT.md#trace-id
     */
    public w3cTraceId() {
        return this._idGenerator.generateTraceId();
    }

    public w3cSpanId() {
        return this._idGenerator.generateSpanId();
    }

    public isValidW3CId(id: string): boolean {
        return isValidTraceId(id);
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

    /**
     * Manually call toJSON if available to pre-convert the value.
     * If a primitive is returned, then the consumer of this function can skip JSON.stringify.
     * This avoids double escaping of quotes for Date objects, for example.
     */
    protected extractObject(origProperty: any): any {
        if (origProperty instanceof Error) {
            return this.extractError(origProperty);
        }
        if (typeof origProperty.toJSON === "function") {
            return origProperty.toJSON();
        }
        return origProperty;
    }

    /**
     * Validate that an object is of type { [key: string]: string }
     */
    public validateStringMap(obj: any): { [key: string]: string } {
        if (typeof obj !== "object") {
            Logger.getInstance().info("Invalid properties dropped from payload");
            return;
        }
        const map: { [key: string]: string } = {};
        for (const field in obj) {
            let property = "";
            const origProperty: any = obj[field];
            const propType = typeof origProperty;

            if (this.isPrimitive(origProperty)) {
                property = origProperty.toString();
            } else if (origProperty === null || propType === "undefined") {
                property = "";
            } else if (propType === "function") {
                Logger.getInstance().info(`key: ${field} was function; will not serialize`);
                continue;
            } else {
                const stringTarget = this.isArray(origProperty)
                    ? origProperty
                    : this.extractObject(origProperty);
                try {
                    if (this.isPrimitive(stringTarget)) {
                        property = stringTarget;
                    } else {
                        property = JSON.stringify(stringTarget);
                    }
                } catch (e) {
                    property = `${origProperty.constructor.name.toString()} (Error: ${e.message})`;
                    Logger.getInstance().info(`key: ${field}, could not be serialized`);
                }
            }

            map[field] = property.substring(0, this.MAX_PROPERTY_LENGTH);
        }
        return map;
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
     * Generate request
     *
     * Proxify the request creation to handle proxy http
     *
     * @param {string} requestUrl url endpoint
     * @param {Object} requestOptions Request option
     * @param {Function} requestCallback callback on request
     * @param {boolean} useProxy Use proxy URL from config
     * @param {boolean} useAgent Set Http Agent in request
     * @returns {http.ClientRequest} request object
     */
    public makeRequest(
        config: ApplicationInsightsConfig,
        requestUrl: string,
        requestOptions: http.RequestOptions | https.RequestOptions,
        requestCallback: (res: http.IncomingMessage) => void,
        useProxy = true,
        useAgent = true
    ): http.ClientRequest {
        if (requestUrl && requestUrl.indexOf("//") === 0) {
            requestUrl = `https:${requestUrl}`;
        }

        const requestUrlParsed = new url.URL(requestUrl);
        let options = {
            ...requestOptions,
            host: requestUrlParsed.hostname,
            port: requestUrlParsed.port,
            path: requestUrlParsed.pathname,
        };

        let proxyUrl: string = undefined;
        if (useProxy) {
            if (proxyUrl) {
                if (proxyUrl.indexOf("//") === 0) {
                    proxyUrl = `http:${proxyUrl}`;
                }
                try {
                    const proxyUrlParsed = new url.URL(proxyUrl);
                    // https is not supported at the moment
                    if (proxyUrlParsed.protocol === "https:") {
                        Logger.getInstance().info("Proxies that use HTTPS are not supported");
                        proxyUrl = undefined;
                    } else {
                        options = {
                            ...options,
                            host: proxyUrlParsed.hostname,
                            port: proxyUrlParsed.port || "80",
                            path: requestUrl,
                            headers: {
                                ...options.headers,
                                Host: requestUrlParsed.hostname,
                            },
                        };
                    }
                } catch (err) {
                    Logger.getInstance().warn("Wrong proxy URL provided");
                }
            }
        }

        const isHttps = requestUrlParsed.protocol === "https:" && !proxyUrl;
        if (useAgent) {
            if (isHttps) {
                // HTTPS without a passed in agent. Use one that enforces our TLS rules
                options.agent = this.tlsRestrictedAgent;
            }
        }
        // prevent calls from generating spans
        let request: http.ClientRequest = null;
        context.with(suppressTracing(context.active()), () => {
            if (isHttps) {
                request = https.request(<any>options, requestCallback);
            } else {
                request = http.request(<any>options, requestCallback);
            }
        });
        return request;
    }

    /**
     * Returns string representation of an object suitable for diagnostics Logger.getInstance().
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
            Logger.getInstance().warn("Failed to serialize payload", error, payload);
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
