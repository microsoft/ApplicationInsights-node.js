"use strict";
var http = require("http");
var https = require("https");
var zlib = require("zlib");
var Logging = require("../Library/Logging");
var snippetInjectionHelper = require("../Library/SnippetInjectionHelper");
var prefixHelper = require("../Library/PrefixHelper");
var Constants = require("../Declarations/Constants");
var ConnectionStringParser = require("../Library/ConnectionStringParser");
var applicationinsights_web_snippet_1 = require("@microsoft/applicationinsights-web-snippet");
var WebSnippet = /** @class */ (function () {
    function WebSnippet(client) {
        var _a;
        this._isIkeyValid = true;
        if (!!WebSnippet.INSTANCE) {
            throw new Error("Web snippet injection should be configured from the applicationInsights object");
        }
        WebSnippet.INSTANCE = this;
        // AI URL used to validate if snippet already included
        WebSnippet._aiUrl = Constants.WEB_INSTRUMENTATION_DEFAULT_SOURCE;
        WebSnippet._aiDeprecatedUrl = Constants.WEB_INSTRUMENTATION_DEPRECATED_SOURCE;
        var clientWebIkey = this._getWebSnippetIkey((_a = client.config) === null || _a === void 0 ? void 0 : _a.webInstrumentationConnectionString);
        this._webInstrumentationIkey = clientWebIkey || client.config.instrumentationKey;
        this._clientWebInstrumentationConfig = client.config.webInstrumentationConfig;
        this._clientWebInstrumentationSrc = client.config.webInstrumentationSrc;
        this._statsbeat = client.getStatsbeat();
    }
    WebSnippet.prototype.enable = function (isEnabled, webInstrumentationConnectionString) {
        this._isEnabled = isEnabled;
        this._webInstrumentationIkey = this._getWebSnippetIkey(webInstrumentationConnectionString) || this._webInstrumentationIkey;
        WebSnippet._snippet = this._getWebInstrumentationReplacedStr();
        if (this._isEnabled && !this._isInitialized && this._isIkeyValid) {
            if (this._statsbeat) {
                this._statsbeat.addFeature(Constants.StatsbeatFeature.WEB_SNIPPET);
            }
            this._initialize();
        }
        else if (!this._isEnabled) {
            if (this._statsbeat) {
                this._statsbeat.removeFeature(Constants.StatsbeatFeature.WEB_SNIPPET);
            }
        }
    };
    WebSnippet.prototype.isInitialized = function () {
        return this._isInitialized;
    };
    WebSnippet.prototype._getWebSnippetIkey = function (connectionString) {
        var iKey = null;
        try {
            var csCode = ConnectionStringParser.parse(connectionString);
            var iKeyCode = csCode.instrumentationkey || "";
            if (!ConnectionStringParser.isIkeyValid(iKeyCode)) {
                this._isIkeyValid = false;
                Logging.info("Invalid web Instrumentation connection string, web Instrumentation is not enabled.");
            }
            else {
                this._isIkeyValid = true;
                iKey = iKeyCode;
            }
        }
        catch (err) {
            Logging.info("get web snippet ikey error: " + err);
        }
        return iKey;
    };
    WebSnippet.prototype._getWebInstrumentationReplacedStr = function () {
        var configStr = this._getClientWebInstrumentationConfigStr(this._clientWebInstrumentationConfig);
        var osStr = prefixHelper.getOsPrefix();
        var rpStr = prefixHelper.getResourceProvider();
        var snippetReplacedStr = this._webInstrumentationIkey + "\",\r\n" + configStr + " disableIkeyDeprecationMessage: true,\r\n sdkExtension: \"" + rpStr + osStr + "d_n_";
        var replacedSnippet = applicationinsights_web_snippet_1.webSnippet.replace("INSTRUMENTATION_KEY", snippetReplacedStr);
        if (this._clientWebInstrumentationSrc) {
            return replacedSnippet.replace(Constants.WEB_INSTRUMENTATION_DEFAULT_SOURCE + ".2.min.js", this._clientWebInstrumentationSrc);
        }
        return replacedSnippet;
    };
    // Do not use string replace here, because double quote should be kept.
    // we want to transfer all values of config to the web snippet in the following way:
    // cfg: {
    //      config1: "config1 string value",
    //      config2: true,
    //      config3: 1,
    //      ...
    //}});
    WebSnippet.prototype._getClientWebInstrumentationConfigStr = function (config) {
        var configStr = "";
        try {
            if (config != undefined && config.length > 0) {
                config.forEach(function (item) {
                    var key = item.name;
                    if (key === undefined)
                        return;
                    var val = item.value;
                    var entry = "";
                    // NOTE: users should convert object/function to string themselves
                    // Type "function" and "object" will be skipped!
                    switch (typeof val) {
                        case "function":
                            break;
                        case "object":
                            break;
                        case "string":
                            entry = " " + key + ": \"" + val + "\",\r\n";
                            configStr += entry;
                            break;
                        default:
                            entry = " " + key + ": " + val + ",\r\n";
                            configStr += entry;
                            break;
                    }
                });
            }
        }
        catch (e) {
            // if has any errors here, web Instrumentation will be disabled.
            this._isEnabled = false;
            Logging.info("Parse client web instrumentation error. Web Instrumentation is disabled");
        }
        return configStr;
    };
    WebSnippet.prototype._initialize = function () {
        this._isInitialized = true;
        var originalHttpServer = http.createServer;
        var originalHttpsServer = https.createServer;
        var isEnabled = this._isEnabled;
        http.createServer = function (requestListener) {
            var originalRequestListener = requestListener;
            if (originalRequestListener) {
                requestListener = function (request, response) {
                    // Patch response write method
                    var originalResponseWrite = response.write;
                    var isGetRequest = request.method == "GET";
                    response.write = function wrap(a, b, c) {
                        //only patch GET request
                        try {
                            if (isEnabled && isGetRequest) {
                                var headers = snippetInjectionHelper.getContentEncodingFromHeaders(response);
                                var writeBufferType = undefined;
                                if (typeof b === "string") {
                                    writeBufferType = b;
                                }
                                if (headers === null || headers === undefined) {
                                    if (WebSnippet.INSTANCE.ValidateInjection(response, a)) {
                                        arguments[0] = WebSnippet.INSTANCE.InjectWebSnippet(response, a, undefined, writeBufferType);
                                    }
                                }
                                else if (headers.length) {
                                    var encodeType = headers[0];
                                    arguments[0] = WebSnippet.INSTANCE.InjectWebSnippet(response, a, encodeType);
                                }
                            }
                        }
                        catch (err) {
                            Logging.warn("Inject snippet error: " + err);
                        }
                        return originalResponseWrite.apply(response, arguments);
                    };
                    // Patch response end method for cases when HTML is added there
                    var originalResponseEnd = response.end;
                    response.end = function wrap(a, b, c) {
                        if (isEnabled && isGetRequest) {
                            try {
                                if (isEnabled && isGetRequest) {
                                    var headers = snippetInjectionHelper.getContentEncodingFromHeaders(response);
                                    var endBufferType = undefined;
                                    if (typeof b === "string") {
                                        endBufferType = b;
                                    }
                                    if (headers === null || headers === undefined) {
                                        if (WebSnippet.INSTANCE.ValidateInjection(response, a)) {
                                            arguments[0] = WebSnippet.INSTANCE.InjectWebSnippet(response, a, undefined, endBufferType);
                                        }
                                    }
                                    else if (headers.length) {
                                        var encodeType = headers[0];
                                        arguments[0] = WebSnippet.INSTANCE.InjectWebSnippet(response, a, encodeType);
                                    }
                                }
                            }
                            catch (err) {
                                Logging.warn("Inject snipet error: " + err);
                            }
                        }
                        return originalResponseEnd.apply(response, arguments);
                    };
                    return originalRequestListener(request, response);
                };
            }
            return originalHttpServer(requestListener);
        };
        https.createServer = function (options, httpsRequestListener) {
            var originalHttpsRequestListener = httpsRequestListener;
            if (originalHttpsRequestListener) {
                httpsRequestListener = function (req, res) {
                    var isGetHttpsRequest = req.method == "GET";
                    var originalHttpsResponseWrite = res.write;
                    var originalHttpsResponseEnd = res.end;
                    res.write = function wrap(a, b, c) {
                        try {
                            if (isEnabled && isGetHttpsRequest) {
                                var headers = snippetInjectionHelper.getContentEncodingFromHeaders(res);
                                var writeBufferType = undefined;
                                if (typeof b === "string") {
                                    writeBufferType = b;
                                }
                                if (headers === null || headers === undefined) {
                                    if (WebSnippet.INSTANCE.ValidateInjection(res, a)) {
                                        arguments[0] = this.InjectWebSnippet(res, a, undefined, writeBufferType);
                                    }
                                }
                                else if (headers.length) {
                                    var encodeType = headers[0];
                                    arguments[0] = WebSnippet.INSTANCE.InjectWebSnippet(res, a, encodeType);
                                }
                            }
                        }
                        catch (err) {
                            Logging.warn("Inject snippet error: " + err);
                        }
                        return originalHttpsResponseWrite.apply(res, arguments);
                    };
                    res.end = function wrap(a, b, c) {
                        try {
                            if (isEnabled && isGetHttpsRequest) {
                                var headers = snippetInjectionHelper.getContentEncodingFromHeaders(res);
                                var endBufferType = undefined;
                                if (typeof b === "string") {
                                    endBufferType = b;
                                }
                                if (headers === null || headers === undefined) {
                                    if (WebSnippet.INSTANCE.ValidateInjection(res, a)) {
                                        arguments[0] = WebSnippet.INSTANCE.InjectWebSnippet(res, a, undefined, endBufferType);
                                    }
                                }
                                else if (headers.length) {
                                    var encodeType = headers[0];
                                    arguments[0] = WebSnippet.INSTANCE.InjectWebSnippet(res, a, encodeType);
                                }
                            }
                        }
                        catch (err) {
                            Logging.warn("Inject snippet error: " + err);
                        }
                        return originalHttpsResponseEnd.apply(res, arguments);
                    };
                    return originalHttpsRequestListener(req, res);
                };
                return originalHttpsServer(options, httpsRequestListener);
            }
        };
    };
    /**
     * Validate response and try to inject Web snippet
     */
    WebSnippet.prototype.ValidateInjection = function (response, input) {
        try {
            if (!response || !input || response.statusCode != 200)
                return false;
            var isContentHtml = snippetInjectionHelper.isContentTypeHeaderHtml(response);
            if (!isContentHtml)
                return false;
            var inputStr = input.slice().toString();
            if (inputStr.indexOf("<head>") >= 0 && inputStr.indexOf("</head>") >= 0) {
                // Check if snippet not already present looking for AI Web SDK URL
                if (inputStr.indexOf(WebSnippet._aiUrl) < 0 && inputStr.indexOf(WebSnippet._aiDeprecatedUrl) < 0) {
                    return true;
                }
            }
        }
        catch (err) {
            Logging.info("validate injections error: " + err);
        }
        return false;
    };
    /**
     * Inject Web snippet
     */
    WebSnippet.prototype.InjectWebSnippet = function (response, input, encodeType, bufferEncodeType) {
        try {
            var isCompressedBuffer = !!encodeType;
            if (!isCompressedBuffer) {
                var html = input.toString();
                var index = html.indexOf("</head>");
                if (index < 0)
                    return input;
                var newHtml = snippetInjectionHelper.insertSnippetByIndex(index, html, WebSnippet._snippet);
                if (typeof input === "string") {
                    response.removeHeader("Content-Length");
                    input = newHtml;
                    response.setHeader("Content-Length", Buffer.byteLength(input));
                }
                else if (Buffer.isBuffer(input)) {
                    var bufferType = bufferEncodeType ? bufferEncodeType : "utf8";
                    var isValidBufferType = snippetInjectionHelper.isBufferType(input, bufferType);
                    if (isValidBufferType) {
                        response.removeHeader("Content-Length");
                        var encodedString = Buffer.from(newHtml).toString(bufferType);
                        input = Buffer.from(encodedString, bufferType);
                        response.setHeader("Content-Length", input.length);
                    }
                }
            }
            else {
                response.removeHeader("Content-Length");
                input = this._getInjectedCompressBuffer(response, input, encodeType);
                response.setHeader("Content-Length", input.length);
            }
        }
        catch (ex) {
            Logging.warn("Failed to inject web snippet and change content-lenght headers. Exception:" + ex);
        }
        return input;
    };
    //***********************
    // should NOT use sync functions here. But currently cannot get async functions to work
    // because reponse.write return boolean
    // and also this function do not support partial compression as well
    // need more investigation
    WebSnippet.prototype._getInjectedCompressBuffer = function (response, input, encodeType) {
        try {
            switch (encodeType) {
                case snippetInjectionHelper.contentEncodingMethod.GZIP:
                    var gunzipBuffer = zlib.gunzipSync(input);
                    if (this.ValidateInjection(response, gunzipBuffer)) {
                        var injectedGunzipBuffer = this.InjectWebSnippet(response, gunzipBuffer);
                        input = zlib.gzipSync(injectedGunzipBuffer);
                    }
                    break;
                case snippetInjectionHelper.contentEncodingMethod.DEFLATE:
                    var inflateBuffer = zlib.inflateSync(input);
                    if (this.ValidateInjection(response, inflateBuffer)) {
                        var injectedInflateBuffer = this.InjectWebSnippet(response, inflateBuffer);
                        input = zlib.deflateSync(injectedInflateBuffer);
                    }
                    break;
                case snippetInjectionHelper.contentEncodingMethod.BR:
                    var BrotliDecompressSync = snippetInjectionHelper.getBrotliDecompressSync(zlib);
                    var BrotliCompressSync = snippetInjectionHelper.getBrotliCompressSync(zlib);
                    if (BrotliDecompressSync && BrotliCompressSync) {
                        var decompressBuffer = BrotliDecompressSync(input);
                        if (this.ValidateInjection(response, decompressBuffer)) {
                            var injectedDecompressBuffer = this.InjectWebSnippet(response, decompressBuffer);
                            input = BrotliCompressSync(injectedDecompressBuffer);
                        }
                        break;
                    }
            }
        }
        catch (err) {
            Logging.info("get web injection compress buffer error: " + err);
        }
        return input;
    };
    WebSnippet.prototype.dispose = function () {
        WebSnippet.INSTANCE = null;
        this.enable(false);
        this._isInitialized = false;
    };
    return WebSnippet;
}());
module.exports = WebSnippet;
//# sourceMappingURL=WebSnippet.js.map