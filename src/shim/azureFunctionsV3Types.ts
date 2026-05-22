// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
//
// Inlined type definitions for the Azure Functions v3 (programming model v3)
// public surface. These mirror the interfaces previously imported from
// `@azure/functions` v3.x (aliased as `@azure/functions-old`) so this SDK can
// keep accepting v3-model Context/HttpRequest objects without taking a runtime
// dependency on that package. Removing the dependency eliminates the
// transitive `uuid@8.x` chain that security scanners flag (MSRC 115880 /
// GHSA-w5hq-g745-h8pq).
//
// Source of truth: @azure/functions@3.5.1 type declarations
// (https://github.com/Azure/azure-functions-nodejs-library, MIT).

/**
 * HTTP request headers.
 */
export interface HttpRequestHeaders {
    [name: string]: string;
}

/**
 * HTTP response headers.
 */
export interface HttpResponseHeaders {
    [name: string]: string;
}

/**
 * Query string parameter keys and values from the URL.
 */
export interface HttpRequestQuery {
    [name: string]: string;
}

/**
 * Route parameter keys and values.
 */
export interface HttpRequestParams {
    [name: string]: string;
}

/**
 * Possible values for an HTTP request method.
 */
export type HttpMethod =
    | "GET"
    | "POST"
    | "DELETE"
    | "HEAD"
    | "PATCH"
    | "PUT"
    | "OPTIONS"
    | "TRACE"
    | "CONNECT";

/**
 * Possible values for an HTTP Request user type.
 */
export type HttpRequestUserType = "AppService" | "StaticWebApps";

/**
 * Object representing a logged-in user, either through
 * AppService/Functions authentication or SWA Authentication.
 */
export interface HttpRequestUser {
    type: HttpRequestUserType;
    id: string;
    username: string;
    identityProvider: string;
    claimsPrincipalData: {
        [key: string]: any;
    };
}

export interface FormPart {
    value: Buffer;
    fileName?: string;
    contentType?: string;
}

export interface Form extends Iterable<[string, FormPart]> {
    get(name: string): FormPart | null;
    getAll(name: string): FormPart[];
    has(name: string): boolean;
    length: number;
}

/**
 * HTTP request object. Provided to your function when using HTTP Bindings.
 */
export interface HttpRequest {
    method: HttpMethod | null;
    url: string;
    headers: HttpRequestHeaders;
    query: HttpRequestQuery;
    params: HttpRequestParams;
    user: HttpRequestUser | null;
    body?: any;
    rawBody?: any;
    bufferBody?: Buffer;
    get(field: string): string | undefined;
    parseFormBody(): Form;
}

/**
 * TraceContext information to enable distributed tracing scenarios.
 */
export interface TraceContext {
    traceparent: string | null | undefined;
    tracestate: string | null | undefined;
    attributes:
        | {
              [k: string]: string;
          }
        | null
        | undefined;
}

export interface Exception {
    source?: string | null;
    stackTrace?: string | null;
    message?: string | null;
}

export interface RetryContext {
    retryCount: number;
    maxRetryCount: number;
    exception?: Exception;
}

export interface ExecutionContext {
    invocationId: string;
    functionName: string;
    functionDirectory: string;
    retryContext: RetryContext | null;
}

export interface ContextBindings {
    [name: string]: any;
}

export interface ContextBindingData {
    invocationId: string;
    [name: string]: any;
}

export interface BindingDefinition {
    name: string;
    type: string;
    direction: "in" | "out" | "inout" | undefined;
}

/**
 * Allows you to write streaming function logs.
 */
export interface Logger {
    (...args: any[]): void;
    error(...args: any[]): void;
    warn(...args: any[]): void;
    info(...args: any[]): void;
    verbose(...args: any[]): void;
}

/**
 * The context object can be used for writing logs, reading data from bindings,
 * setting outputs and using the context.done callback when your exported
 * function is synchronous. A context object is passed to your function from the
 * Azure Functions runtime on function invocation.
 */
export interface Context {
    invocationId: string;
    executionContext: ExecutionContext;
    bindings: ContextBindings;
    bindingData: ContextBindingData;
    traceContext: TraceContext;
    bindingDefinitions: BindingDefinition[];
    log: Logger;
    done(err?: Error | string | null, result?: any): void;
    req?: HttpRequest;
    res?: {
        [key: string]: any;
    };
    suppressAsyncDoneError?: boolean;
}
