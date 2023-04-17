/// <reference types="node" />
import http = require("http");
import https = require("https");
import Config = require("./Config");
import TelemetryClient = require("../Library/TelemetryClient");
import { HttpRequest } from "../Library/Functions";
declare class Util {
    private static _useKeepAlive;
    private static _listenerAttached;
    static MAX_PROPERTY_LENGTH: number;
    static keepAliveAgent: http.Agent;
    static tlsRestrictedAgent: http.Agent;
    static isNodeExit: boolean;
    constructor();
    /**
     * helper method to access userId and sessionId cookie
     */
    static getCookie(name: string, cookie: string): string;
    /**
     * helper method to trim strings (IE8 does not implement String.prototype.trim)
     */
    static trim(str: string): string;
    /**
     * Convert an array of int32 to Base64 (no '==' at the end).
     * MSB first.
     */
    static int32ArrayToBase64(array: number[]): string;
    /**
     * generate a random 32bit number (-0x80000000..0x7FFFFFFF).
     */
    static random32(): number;
    /**
     * generate a random 32bit number (0x00000000..0xFFFFFFFF).
     */
    static randomu32(): number;
    /**
     * generate W3C-compatible trace id
     * https://github.com/w3c/distributed-tracing/blob/master/trace_context/HTTP_HEADER_FORMAT.md#trace-id
     */
    static w3cTraceId(): string;
    static w3cSpanId(): string;
    static isValidW3CId(id: string): boolean;
    /**
     * Check if an object is of type Array
     */
    static isArray(obj: any): boolean;
    /**
     * Check if an object is of type Error
     */
    static isError(obj: any): boolean;
    static isPrimitive(input: any): boolean;
    /**
     * Check if an object is of type Date
     */
    static isDate(obj: any): boolean;
    /**
     * Convert ms to c# time span format
     */
    static msToTimeSpan(totalms: number): string;
    /**
     * Using JSON.stringify, by default Errors do not serialize to something useful:
     * Simplify a generic Node Error into a simpler map for customDimensions
     * Custom errors can still implement toJSON to override this functionality
     */
    protected static extractError(err: Error): {
        message: string;
        code: string;
    };
    /**
     * Manually call toJSON if available to pre-convert the value.
     * If a primitive is returned, then the consumer of this function can skip JSON.stringify.
     * This avoids double escaping of quotes for Date objects, for example.
     */
    protected static extractObject(origProperty: any): any;
    /**
     * Validate that an object is of type { [key: string]: string }
     */
    static validateStringMap(obj: any): {
        [key: string]: string;
    };
    /**
     * Checks if a request url is not on a excluded domain list
     * and if it is safe to add correlation headers
     */
    static canIncludeCorrelationHeader(client: TelemetryClient, requestUrl: string): boolean;
    static getCorrelationContextTarget(response: http.ClientResponse | http.ServerRequest | HttpRequest, key: string): any;
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
    static makeRequest(config: Config, requestUrl: string, requestOptions: http.RequestOptions | https.RequestOptions, requestCallback: (res: http.IncomingMessage) => void, useProxy?: boolean, useAgent?: boolean): http.ClientRequest;
    /**
     * Parse standard <string | string[] | number> request-context header
     */
    static safeIncludeCorrelationHeader(client: TelemetryClient, request: http.ClientRequest | http.ServerResponse, correlationHeader: any): void;
    /**
     * Returns string representation of an object suitable for diagnostics logging.
     */
    static dumpObj(object: any): string;
    static stringify(payload: any): string;
    private static addCorrelationIdHeaderFromString;
    private static _addCloseHandler;
}
export = Util;
