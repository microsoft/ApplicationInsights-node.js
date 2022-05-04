import http = require("http");
import https = require("https");
import zlib = require("zlib");

import Logging = require("../Library/Logging");
import TelemetryClient = require("../Library/TelemetryClient");
import snippetInjectionHelper = require("../Library/SnippetInjectionHelper");
import ConnectionStringParser = require("../Library/ConnectionStringParser");

class WebSnippet {

    public static INSTANCE: WebSnippet;

    private static _snippet: string;
    private static _aiUrl: string;
    private static _aiDeprecatedUrl: string;
    private _isEnabled: boolean;
    private _isInitialized: boolean;
    private _isIkeyValid: boolean = true;
    

    constructor(client: TelemetryClient) {
        if (!!WebSnippet.INSTANCE) {
            throw new Error("Web snippet injection should be configured from the applicationInsights object");
        }

        WebSnippet.INSTANCE = this;
        // AI URL used to validate if snippet already included
        WebSnippet._aiUrl = "https://js.monitor.azure.com/scripts/b/ai";
        WebSnippet._aiDeprecatedUrl = "https://az416426.vo.msecnd.net/scripts/b/ai";

        let clientSnippetConnectionString = client.config.webSnippetConnectionString;
        let defaultIkey = client.config.instrumentationKey;
        if (!!clientSnippetConnectionString) {
            let clientSnippetIkey = this._getWebSnippetIkey(client.config.webSnippetConnectionString);
            defaultIkey = clientSnippetIkey;
        }

        //TODO: quick fix for bundle error, remove this when npm is published
        WebSnippet._snippet = snippetInjectionHelper.webSnippet.replace("INSTRUMENTATION_KEY", defaultIkey);

        //TODO: replace the path with npm package exports
        //NOTE: should use the following part when npm is enabled
        // let snippetPath = path.resolve(__dirname, "../../AutoCollection/snippet/snippet.min.js");
        // try {
        //     fs.readFile(snippetPath, function (err, snippet) {
        //         if (err) {
        //             Logging.warn("Failed to load AI Web snippet. Ex:" + err);
        //         }
        //         //TODO:should add extra config: snippetInstrumentationKey
        //         WebSnippet._snippet = snippet.toString().replace("INSTRUMENTATION_KEY", client.config.instrumentationKey);
        //     });
        // } catch (err) {
        //     Logging.warn("Read snippet error: " + err);
        // }
      
    }

    public enable(isEnabled: boolean, webSnippetConnectionString?: string ) {
        this._isEnabled = isEnabled;
        if (!!webSnippetConnectionString) {
            let iKey = this._getWebSnippetIkey(webSnippetConnectionString);
            WebSnippet._snippet = snippetInjectionHelper.webSnippet.replace("INSTRUMENTATION_KEY", iKey);
        }
        if (this._isEnabled && !this._isInitialized && this._isIkeyValid) {
            this._initialize();
        }
    }

    public isInitialized() {
        return this._isInitialized;
    }

    private _getWebSnippetIkey(connectionString: string) {
        const csCode = ConnectionStringParser.parse(connectionString);
        const iKeyCode = csCode.instrumentationkey || "";
        if (!snippetInjectionHelper.isWebSnippetIkeyValid(iKeyCode)) {
            this._isIkeyValid = false;
            Logging.info("Invalid web snippet connection string, web snippet will not be injected.");
        }
        return iKeyCode;
    }

    private _initialize() {
        this._isInitialized = true;
        const originalHttpServer = http.createServer;
        const originalHttpsServer = https.createServer;
        var isEnabled = this._isEnabled;

        http.createServer = (requestListener?: (request: http.IncomingMessage, response: http.ServerResponse) => void) => {
            const originalRequestListener = requestListener;
            if (originalRequestListener) {
                requestListener = (request: http.IncomingMessage, response: http.ServerResponse) => {
                    // Patch response write method
                    let originalResponseWrite = response.write;
                    let isGetRequest = request.method == "GET";
                    response.write = function wrap(a: Buffer | string, b?: Function | string, c?:  Function | string) {
                        //only patch GET request
                        try {
                            if (isEnabled && isGetRequest) {
                                let headers =  snippetInjectionHelper.getContentEncodingFromHeaders(response);
                                let writeBufferType = undefined;
                                if (typeof b === "string") {
                                    writeBufferType = b;
                                }
                                if (headers === null || headers === undefined) {
                                    if (WebSnippet.INSTANCE.ValidateInjection(response, a)) {
                                        arguments[0] = WebSnippet.INSTANCE.InjectWebSnippet(response, a, undefined, writeBufferType);
                                    }
                                } else if (headers.length) {
                                    let encodeType = headers[0];
                                    arguments[0] = WebSnippet.INSTANCE.InjectWebSnippet(response, a, encodeType);
                                }
                            }
                        } catch (err) {
                            Logging.warn("Inject snippet error: "+ err);
                        }
                        return originalResponseWrite.apply(response, arguments);
                    }

                    // Patch response end method for cases when HTML is added there
                    let originalResponseEnd = response.end;

                    response.end = function wrap(a?: Buffer | string | any, b?: Function | string, c?: Function) {
                        if (isEnabled && isGetRequest) {
                            try {
                                if (isEnabled && isGetRequest) {
                                    let headers =  snippetInjectionHelper.getContentEncodingFromHeaders(response);
                                    let endBufferType = undefined;
                                    if (typeof b === "string") {
                                        endBufferType = b;
                                    }
                                    if (headers === null || headers === undefined) {
                                        if (WebSnippet.INSTANCE.ValidateInjection(response, a)) {
                                            arguments[0] = WebSnippet.INSTANCE.InjectWebSnippet(response, a, undefined, endBufferType);
                                        }
                                    } else if (headers.length) {
                                        let encodeType = headers[0];
                                        arguments[0] = WebSnippet.INSTANCE.InjectWebSnippet(response, a, encodeType);
                                    }
                                }
                            } catch (err) {
                                Logging.warn("Inject snipet error: "+ err);
                            }
                        }
                        return originalResponseEnd.apply(response, arguments);
                    }

                    return originalRequestListener(request, response);
                }
            }
            return originalHttpServer(requestListener);
        }

        https.createServer = function(options,httpsRequestListener) {
            const originalHttpsRequestListener = httpsRequestListener;
            if (originalHttpsRequestListener) {
                httpsRequestListener = function (req, res) {
                    let isGetHttpsRequest = req.method == "GET";
                    let originalHttpsResponseWrite = res.write;
                    let originalHttpsResponseEnd = res.end;
                    res.write = function wrap(a: Buffer | string | any, b?:Function | string, c?: Function) {
                        try {
                            if (isEnabled && isGetHttpsRequest) {
                                let headers =  snippetInjectionHelper.getContentEncodingFromHeaders(res);
                                let writeBufferType = undefined;
                                if (typeof b === "string") {
                                    writeBufferType = b;
                                }
                                if (headers === null || headers === undefined) {
                                    if (WebSnippet.INSTANCE.ValidateInjection(res, a)) {
                                        arguments[0] = this.InjectWebSnippet(res, a, undefined, writeBufferType);
                                    }
                                } else if (headers.length) {
                                    let encodeType = headers[0];
                                    arguments[0] = WebSnippet.INSTANCE.InjectWebSnippet(res, a, encodeType);
                                }
                            }
                        } catch (err) {
                            Logging.warn("Inject snippet error: "+ err);
                        }
                        return originalHttpsResponseWrite.apply(res,arguments);
                    }

                    res.end = function wrap(a: Buffer | string | any, b?:Function | string, c?: Function) {
                        try {
                            if (isEnabled && isGetHttpsRequest) {
                                let headers =  snippetInjectionHelper.getContentEncodingFromHeaders(res);
                                let endBufferType = undefined;
                                if (typeof b === "string") {
                                    endBufferType = b;
                                }
                                if (headers === null || headers === undefined) {
                                    if (WebSnippet.INSTANCE.ValidateInjection(res, a)) {
                                        arguments[0] = WebSnippet.INSTANCE.InjectWebSnippet(res, a, undefined, endBufferType);
                                    }
                                } else if (headers.length) {
                                    let encodeType = headers[0];
                                    arguments[0] = WebSnippet.INSTANCE.InjectWebSnippet(res, a, encodeType);
                                }
                            }
                        } catch (err) {
                            Logging.warn("Inject snippet error: "+ err);
                        }
                        return originalHttpsResponseEnd.apply(res,arguments);

                    }
                    return originalHttpsRequestListener(req,res);
                }
                return originalHttpsServer(options, httpsRequestListener);

            }
          
        }

    }

    /**
     * Validate response and try to inject Web snippet
     */
    public ValidateInjection(response: http.ServerResponse, input: string | Buffer): boolean {

        if (!response || !input || response.statusCode != 200) return false;
        let isContentHtml =  snippetInjectionHelper.isContentTypeHeaderHtml(response);
        if (!isContentHtml) return false;
        let inputStr = input.slice().toString();
        if (inputStr.indexOf("<head>") >= 0 && inputStr.indexOf("</head>") >= 0) {
            // Check if snippet not already present looking for AI Web SDK URL
            if (inputStr.indexOf(WebSnippet._aiUrl) < 0 && inputStr.indexOf(WebSnippet._aiDeprecatedUrl) < 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * Inject Web snippet
     */
    public InjectWebSnippet(response: http.ServerResponse, input: string | Buffer, encodeType?: snippetInjectionHelper.contentEncodingMethod, bufferEncodeType?: string ): string | Buffer {
        try {
            let isCompressedBuffer = !!encodeType;
            if (!isCompressedBuffer) {
                let html = input.toString();
                let index = html.indexOf("</head>");
                if (index < 0) return input;

                let newHtml = snippetInjectionHelper.insertSnippetByIndex(index,html,WebSnippet._snippet);
                if (typeof input === "string") {
                    response.removeHeader("Content-Length");
                    input = newHtml;
                    response.setHeader("Content-Length", Buffer.byteLength(input));
                } else if (Buffer.isBuffer(input)) {
                    let bufferType = bufferEncodeType? bufferEncodeType:"utf8";
                    let isValidBufferType = snippetInjectionHelper.isBufferType(input, bufferType);
                    if (isValidBufferType) {
                        response.removeHeader("Content-Length");
                        let encodedString = Buffer.from(newHtml).toString(bufferType);
                        input = Buffer.from(encodedString,bufferType);
                        response.setHeader("Content-Length", input.length);
                    }
                }
            } else {
                response.removeHeader("Content-Length");
                input = this._getInjectedCompressBuffer(response,input as Buffer,encodeType);
                response.setHeader("Content-Length", input.length);
            }
        }
        catch (ex) {
            Logging.warn("Failed to inject web snippet and change content-lenght headers. Exception:" + ex);
        }
        return input;
    }

    //***********************
    // should NOT use sync functions here. But currently cannot get async functions to work
    // because reponse.write return boolean
    // and also this function do not support partial compression as well
    // need more investigation
    private _getInjectedCompressBuffer(response: http.ServerResponse, input: Buffer, encodeType: snippetInjectionHelper.contentEncodingMethod): Buffer {
        switch (encodeType) {
            case snippetInjectionHelper.contentEncodingMethod.GZIP:
                let gunzipBuffer = zlib.gunzipSync(input);
                if (this.ValidateInjection(response,gunzipBuffer)) {
                    let injectedGunzipBuffer = this.InjectWebSnippet(response, gunzipBuffer);
                    input = zlib.gzipSync(injectedGunzipBuffer);
                 }
                 break;
            case snippetInjectionHelper.contentEncodingMethod.DEFLATE:
                let inflateBuffer = zlib.inflateSync(input);
                if (this.ValidateInjection(response,inflateBuffer)) {
                    let injectedInflateBuffer = this.InjectWebSnippet(response, inflateBuffer);
                    input = zlib.deflateSync(injectedInflateBuffer);
                 }
                 break;
            case snippetInjectionHelper.contentEncodingMethod.BR:
                let BrotliDecompressSync = snippetInjectionHelper.getBrotliDecompressSync(zlib);
                let BrotliCompressSync = snippetInjectionHelper.getBrotliCompressSync(zlib);
                if (BrotliDecompressSync && BrotliCompressSync) {
                    let decompressBuffer = BrotliDecompressSync(input);
                    if (this.ValidateInjection(response,decompressBuffer)) {
                        let injectedDecompressBuffer = this.InjectWebSnippet(response, decompressBuffer);
                        input = BrotliCompressSync(injectedDecompressBuffer);
                     }
                     break;
                }
        }

        return input;
    }

    public dispose() {
        WebSnippet.INSTANCE = null;
        this.enable(false);
        this._isInitialized = false;
    }
}

export = WebSnippet;
