import * as path from "path";
import http = require("http");
import https = require("https");
import fs = require("fs");
import zlib = require("zlib");

import Logging = require("../Library/Logging");
import TelemetryClient = require("../Library/TelemetryClient");
import snippetInjectionHelper = require("../Library/SnippetInjectionHelper");

class WebSnippet {

    public static INSTANCE: WebSnippet;

    private static _snippet: string;
    private static _aiUrl: string;
    private _isEnabled: boolean;
    private _isInitialized: boolean;
    

    constructor(client: TelemetryClient) {
        if (!!WebSnippet.INSTANCE) {
            throw new Error("Web snippet injection should be configured from the applicationInsights object");
        }

        WebSnippet.INSTANCE = this;
        // AI URL used to validate if snippet already included
        WebSnippet._aiUrl = " https://js.monitor.azure.com/scripts/b/ai.2";

        //TODO: replace the path with npm package exports
        let snippetPath = path.resolve(__dirname, "/snippet/snippet.min.js"); 
        if (client.config.isDebugWebSnippet) {
            snippetPath = path.resolve(__dirname, "/snippet/snippet.js");
        }

        fs.readFile(snippetPath, function (err, snippet) {
            if (err) {
                Logging.warn("Failed to load AI Web snippet. Ex:" + err);
            }
            //TODO:should add extra config: snippetInstrumentationKey
            WebSnippet._snippet = snippet.toString().replace("INSTRUMENTATION_KEY", client.config.instrumentationKey);
        });
    }

    public enable(isEnabled: boolean) {
        this._isEnabled = isEnabled;

        if (this._isEnabled && !this._isInitialized) {
            this._initialize();
        }
    }

    public isInitialized() {
        return this._isInitialized;
    }

    private  _initialize() {
        this._isInitialized = true;
        const originalHttpServer = http.createServer;
        var originalHttpsServer = https.createServer;
        http.createServer = (requestListener?: (request: http.IncomingMessage, response: http.ServerResponse) => void) => {
            const originalRequestListener = requestListener;
            if (originalRequestListener) {
                requestListener = (request: http.IncomingMessage, response: http.ServerResponse) => {
                    // Patch response write method
                    let originalResponseWrite = response.write;
                    let isGetRequest = request.method == "GET";
                    let isEnabled = this._isEnabled;
                    response.write = function wrap(a: Buffer | string, b?: Function | string, c?:  Function | string) {
                        //only patch GET request
                        try {
                            let headers =  snippetInjectionHelper.getContentEncodingFromHeaders(response);
                            if (isEnabled && isGetRequest) {
                                if (!headers) {
                                    if (WebSnippet.ValidateInjection(response, a)) {
                                        arguments[0] = WebSnippet.InjectWebSnippet(response, a);
                                    }
                                } else if (headers.length) {
                                    let encodeType = headers[0];
                                    arguments[0] = WebSnippet.InjectWebSnippet(response, a, encodeType);
                                }
                            }
                        } catch (err) {
                            Logging.info("inject snipet error: "+ err);
                        }
                        return originalResponseWrite.apply(response, arguments);
                    }

                    // Patch response end method for cases when HTML is added there
                    let originalResponseEnd = response.end;

                    response.end = function wrap(a?: Buffer | string | any, b?: Function | string, c?: Function) {
                        if (isEnabled&& isGetRequest) {
                            try {
                                let headers =  snippetInjectionHelper.getContentEncodingFromHeaders(response);
                                if (isEnabled && isGetRequest) {
                                    if (!headers) {
                                        if (WebSnippet.ValidateInjection(response, a)) {
                                            arguments[0] = WebSnippet.InjectWebSnippet(response, a);
                                        }
                                    } else if (headers.length) {
                                        let encodeType = headers[0];
                                        arguments[0] = WebSnippet.InjectWebSnippet(response, a, encodeType);
                                    }
                                }
                            } catch (err) {
                                Logging.info("inject snipet error: "+ err);
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
            var originalHttpsRequestListener = httpsRequestListener;
         
            httpsRequestListener = function (req, res) {
                var isGetHttpsRequest = req.method == "GET";
                var isHttpsEnabled = this._isEnabled;
                var originalHttpsResponseWrite = res.write;
                res.write = function wrap(a,c) {
                    try {
                        let headers =  snippetInjectionHelper.getContentEncodingFromHeaders(res);
                        if (isHttpsEnabled && isGetHttpsRequest) {
                            if (!headers) {
                                if (WebSnippet.ValidateInjection(res, a)) {
                                    arguments[0] = WebSnippet.InjectWebSnippet(res, a);
                                }
                            } else if (headers.length) {
                                let encodeType = headers[0];
                                arguments[0] = WebSnippet.InjectWebSnippet(res, a, encodeType);
                            }
                        }
                    } catch (err) {
                        Logging.info("inject snipet error: "+ err);
                    }
                    return originalHttpsResponseWrite.apply(res,arguments)
                }
                return originalHttpsRequestListener(req,res);
            }
            return originalHttpsServer(options, httpsRequestListener);
        }

    }


    /**
     * Validate response and try to inject Web snippet
     */
    public static ValidateInjection(response: http.ServerResponse, input: string | Buffer): boolean {

        if (!response || !input || response.statusCode != 200) return false;
        let isContentHtml =  snippetInjectionHelper.isContentTypeHeaderHtml(response);
        if (!isContentHtml) return false;
        if (input.indexOf("<head>") >= 0 && input.indexOf("</head>") >= 0) {
            // Check if snippet not already present looking for AI Web SDK URL
            if (input.indexOf(this._aiUrl) < 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * Inject Web snippet
     */
    public static InjectWebSnippet(response: http.ServerResponse, input: string | Buffer, encodeType?: snippetInjectionHelper.contentEncodingMethod): string | Buffer {
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
                    let bufferType = snippetInjectionHelper.findBufferEncodingType(input);
                    if (bufferType) {
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
            Logging.info("Failed to change content-lenght headers for JS injection. Exception:" + ex);
        }
        return input;
    }

    //***********************
    // should NOT use sync functions here. But currently cannot get async functions to work 
    // because reponse.write return boolean
    // and also this function do not support partial compression as well
    // need more investigation 
    private static _getInjectedCompressBuffer(response: http.ServerResponse, input: Buffer, encodeType: snippetInjectionHelper.contentEncodingMethod): Buffer {
        switch (encodeType) {
            case snippetInjectionHelper.contentEncodingMethod.GZIP:
                let gunzipBuffer = zlib.gunzipSync(input);
                if (WebSnippet.ValidateInjection(response,gunzipBuffer)) {
                    let injectedGunzipBuffer = WebSnippet.InjectWebSnippet(response, gunzipBuffer);
                    input = zlib.gzipSync(injectedGunzipBuffer);
                 }
                 break;
            case snippetInjectionHelper.contentEncodingMethod.DEFLATE:
                let inflateBuffer = zlib.inflateSync(input);
                if (WebSnippet.ValidateInjection(response,inflateBuffer)) {
                    let injectedInflateBuffer = WebSnippet.InjectWebSnippet(response, inflateBuffer);
                    input = zlib.deflateSync(injectedInflateBuffer);
                 }
                 break;
            case snippetInjectionHelper.contentEncodingMethod.BR:
                let BrotliDecompressSync = snippetInjectionHelper.getBrotliDecompressSync(zlib);
                let BrotliCompressSync = snippetInjectionHelper.getBrotliCompressSync(zlib);
                if (BrotliDecompressSync && BrotliCompressSync) {
                    let decompressBuffer = BrotliDecompressSync(input);
                    if (WebSnippet.ValidateInjection(response,decompressBuffer)) {
                        let injectedDecompressBuffer = WebSnippet.InjectWebSnippet(response, decompressBuffer);
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
