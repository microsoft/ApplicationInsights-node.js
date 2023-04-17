/// <reference types="node" />
import http = require("http");
import TelemetryClient = require("../Library/TelemetryClient");
import snippetInjectionHelper = require("../Library/SnippetInjectionHelper");
declare class WebSnippet {
    static INSTANCE: WebSnippet;
    private static _snippet;
    private static _aiUrl;
    private static _aiDeprecatedUrl;
    private _isEnabled;
    private _isInitialized;
    private _isIkeyValid;
    private _statsbeat;
    private _webInstrumentationIkey;
    private _clientWebInstrumentationConfig;
    private _clientWebInstrumentationSrc;
    constructor(client: TelemetryClient);
    enable(isEnabled: boolean, webInstrumentationConnectionString?: string): void;
    isInitialized(): boolean;
    private _getWebSnippetIkey;
    private _getWebInstrumentationReplacedStr;
    private _getClientWebInstrumentationConfigStr;
    private _initialize;
    /**
     * Validate response and try to inject Web snippet
     */
    ValidateInjection(response: http.ServerResponse, input: string | Buffer): boolean;
    /**
     * Inject Web snippet
     */
    InjectWebSnippet(response: http.ServerResponse, input: string | Buffer, encodeType?: snippetInjectionHelper.contentEncodingMethod, bufferEncodeType?: string): string | Buffer;
    private _getInjectedCompressBuffer;
    dispose(): void;
}
export = WebSnippet;
