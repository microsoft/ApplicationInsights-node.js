import * as http from "http";
import * as https from "https";
import * as url from "url";
import * as constants from "constants";

import { isValidTraceId } from "@opentelemetry/api";
import { IdGenerator, RandomIdGenerator } from "@opentelemetry/core";

import { Logger } from "./Logging/Logger";
import { Config } from "./Configuration/Config";
import { TelemetryClient } from "../Library/TelemetryClient";
import { RequestHeaders } from "../Declarations/RequestResponseHeaders";
import { HttpRequest } from "../Declarations/Functions";
import { JsonConfig } from "./Configuration/JsonConfig";


export class Util {
    private static _instance: Util;
    private readonly _idGenerator: IdGenerator;
    private _useKeepAlive = !JsonConfig.getInstance().noHttpAgentKeepAlive;
    private _listenerAttached = false;

    public MAX_PROPERTY_LENGTH = 8192;
    public keepAliveAgent: http.Agent = new https.Agent(<any>{
        keepAlive: true,
        maxSockets: 25,
        secureOptions: constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_SSLv3 |
            constants.SSL_OP_NO_TLSv1 | constants.SSL_OP_NO_TLSv1_1
    });
    public tlsRestrictedAgent: http.Agent = new https.Agent(<any>{
        secureOptions: constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_SSLv3 |
            constants.SSL_OP_NO_TLSv1 | constants.SSL_OP_NO_TLSv1_1
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
        } else {
            return "";
        }
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
     * Convert ms to c# time span format
     */
    public msToTimeSpan(totalms: number): string {
        if (isNaN(totalms) || totalms < 0) {
            totalms = 0;
        }

        var sec = ((totalms / 1000) % 60).toFixed(7).replace(/0{0,4}$/, "");
        var min = "" + Math.floor(totalms / (1000 * 60)) % 60;
        var hour = "" + Math.floor(totalms / (1000 * 60 * 60)) % 24;
        var days = Math.floor(totalms / (1000 * 60 * 60 * 24));

        sec = sec.indexOf(".") < 2 ? "0" + sec : sec;
        min = min.length < 2 ? "0" + min : min;
        hour = hour.length < 2 ? "0" + hour : hour;
        var daysText = days > 0 ? days + "." : "";

        return daysText + hour + ":" + min + ":" + sec;
    }

    /**
     * Using JSON.stringify, by default Errors do not serialize to something useful:
     * Simplify a generic Node Error into a simpler map for customDimensions
     * Custom errors can still implement toJSON to override this functionality
     */
    protected extractError(err: Error): { message: string, code: string } {
        // Error is often subclassed so may have code OR id properties:
        // https://nodejs.org/api/errors.html#errors_error_code
        const looseError = err as any;
        return {
            message: err.message,
            code: looseError.code || looseError.id || ""
        }
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
            Logger.info("Invalid properties dropped from payload");
            return;
        }
        const map: { [key: string]: string } = {};
        for (let field in obj) {
            let property: string = "";
            const origProperty: any = obj[field];
            const propType = typeof origProperty;

            if (this.isPrimitive(origProperty)) {
                property = origProperty.toString();
            } else if (origProperty === null || propType === "undefined") {
                property = "";
            } else if (propType === "function") {
                Logger.info("key: " + field + " was function; will not serialize");
                continue;
            } else {
                const stringTarget = this.isArray(origProperty) ? origProperty : this.extractObject(origProperty);
                try {
                    if (this.isPrimitive(stringTarget)) {
                        property = stringTarget;
                    } else {
                        property = JSON.stringify(stringTarget);
                    }
                } catch (e) {
                    property = origProperty.constructor.name.toString() + " (Error: " + e.message + ")";
                    Logger.info("key: " + field + ", could not be serialized");
                }
            }

            map[field] = property.substring(0, this.MAX_PROPERTY_LENGTH);
        }
        return map;
    }


    /**
     * Checks if a request url is not on a excluded domain list
     * and if it is safe to add correlation headers
     */
    public canIncludeCorrelationHeader(client: TelemetryClient, requestUrl: string) {
        let excludedDomains = client && client.config && client.config.correlationHeaderExcludedDomains;
        if (!excludedDomains || excludedDomains.length == 0 || !requestUrl) {
            return true;
        }

        for (let i = 0; i < excludedDomains.length; i++) {
            let regex = new RegExp(excludedDomains[i].replace(/\./g, "\.").replace(/\*/g, ".*"));
            try {
                if (regex.test(new url.URL(requestUrl).hostname)) {
                    return false;
                }
            }
            catch (ex) {
                // Ignore error
            }
        }

        return true;
    }

    public getCorrelationContextTarget(response: http.ClientResponse | http.ServerRequest | HttpRequest, key: string) {
        const contextHeaders = response.headers && response.headers[RequestHeaders.requestContextHeader];
        if (contextHeaders) {
            const keyValues = (<any>contextHeaders).split(",");
            for (let i = 0; i < keyValues.length; ++i) {
                const keyValue = keyValues[i].split("=");
                if (keyValue.length == 2 && keyValue[0] == key) {
                    return keyValue[1];
                }
            }
        }
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
        config: Config,
        requestUrl: string,
        requestOptions: http.RequestOptions | https.RequestOptions,
        requestCallback: (res: http.IncomingMessage) => void,
        useProxy = true,
        useAgent = true): http.ClientRequest {

        if (requestUrl && requestUrl.indexOf("//") === 0) {
            requestUrl = "https:" + requestUrl;
        }

        var requestUrlParsed = new url.URL(requestUrl);
        var options = {
            ...requestOptions,
            host: requestUrlParsed.hostname,
            port: requestUrlParsed.port,
            path: requestUrlParsed.pathname
        };

        var proxyUrl: string = undefined;
        if (useProxy) {
            if (requestUrlParsed.protocol === "https:") {
                proxyUrl = config.proxyHttpsUrl || undefined;
            }
            if (requestUrlParsed.protocol === "http:") {
                proxyUrl = config.proxyHttpUrl || undefined;
            }
            if (proxyUrl) {
                if (proxyUrl.indexOf("//") === 0) {
                    proxyUrl = "http:" + proxyUrl;
                }
                try {
                    var proxyUrlParsed = new url.URL(proxyUrl);
                    // https is not supported at the moment
                    if (proxyUrlParsed.protocol === "https:") {
                        Logger.info("Proxies that use HTTPS are not supported");
                        proxyUrl = undefined;
                    } else {
                        options = {
                            ...options,
                            host: proxyUrlParsed.hostname,
                            port: proxyUrlParsed.port || "80",
                            path: requestUrl,
                            headers: {
                                ...options.headers,
                                Host: requestUrlParsed.hostname
                            }
                        };
                    }
                }
                catch (err) {
                    Logger.warn("Wrong proxy URL provided");
                }
            }
        }

        var isHttps = requestUrlParsed.protocol === "https:" && !proxyUrl;
        if (useAgent) {
            if (isHttps && config.httpsAgent !== undefined) {
                options.agent = config.httpsAgent;
            } else if (!isHttps && config.httpAgent !== undefined) {
                options.agent = config.httpAgent;
            } else if (isHttps) {
                // HTTPS without a passed in agent. Use one that enforces our TLS rules
                options.agent = this._useKeepAlive ? this.keepAliveAgent : this.tlsRestrictedAgent;
            }
        }
        if (isHttps) {
            return https.request(<any>options, requestCallback);
        } else {
            return http.request(<any>options, requestCallback);
        }

    }

    /**
     * Parse standard <string | string[] | number> request-context header
     */
    public safeIncludeCorrelationHeader(client: TelemetryClient, request: http.ClientRequest | http.ServerResponse, correlationHeader: any) {
        let header: string; // attempt to cast correlationHeader to string
        if (typeof correlationHeader === "string") {
            header = correlationHeader;
        } else if (correlationHeader instanceof Array) { // string[]
            header = correlationHeader.join(",");
        } else if (correlationHeader && typeof (correlationHeader as any).toString === "function") {
            // best effort attempt: requires well-defined toString
            try {
                header = (correlationHeader as any).toString();
            } catch (err) {
                Logger.warn("Outgoing request-context header could not be read. Correlation of requests may be lost.", err, correlationHeader);
            }
        }

        if (header) {
            this.addCorrelationIdHeaderFromString(client, request, header);
        } else {
            request.setHeader(
                RequestHeaders.requestContextHeader,
                `${RequestHeaders.requestContextSourceKey}=${client.config.correlationId}`);
        }
    }

    /**
     * Returns string representation of an object suitable for diagnostics Logger.
     */
    public dumpObj(object: any): string {
        const objectTypeDump: string = Object["prototype"].toString.call(object);
        let propertyValueDump: string = "";
        if (objectTypeDump === "[object Error]") {
            propertyValueDump = "{ stack: '" + object.stack + "', message: '" + object.message + "', name: '" + object.name + "'";
        } else {
            propertyValueDump = JSON.stringify(object);
        }

        return objectTypeDump + propertyValueDump;
    }

    public stringify(payload: any) {
        try {
            return JSON.stringify(payload);
        } catch (error) {
            Logger.warn("Failed to serialize payload", error, payload);
        }
    }

    private addCorrelationIdHeaderFromString(client: TelemetryClient, response: http.ClientRequest | http.ServerResponse, correlationHeader: string) {
        const components = correlationHeader.split(",");
        const key = `${RequestHeaders.requestContextSourceKey}=`;
        const found = components.some(value => value.substring(0, key.length) === key);

        if (!found) {
            response.setHeader(
                RequestHeaders.requestContextHeader,
                `${correlationHeader},${RequestHeaders.requestContextSourceKey}=${client.config.correlationId}`);
        }
    }

    private _addCloseHandler() {
        if (!this._listenerAttached) {
            process.on("exit", () => {
                this.isNodeExit = true;
                this._useKeepAlive = false;
            });
            this._listenerAttached = true;
        }
    }
}
