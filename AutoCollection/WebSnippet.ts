import http = require("http");

import Logging = require("../Library/Logging");
import TelemetryClient = require("../Library/TelemetryClient");

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
        WebSnippet._aiUrl = "https://az416426.vo.msecnd.net/scripts/b/ai.2.min.js";
        WebSnippet._snippet = '<script type="text/javascript">' +
            '!function (T, l, y) { var S = T.location, u = "script", k = "instrumentationKey", D = "ingestionendpoint", C = "disableExceptionTracking", E = "ai.device.", I = "toLowerCase", b = "crossOrigin", w = "POST", e = "appInsightsSDK", t = y.name || "appInsights"; (y.name || T[e]) && (T[e] = t); var n = T[t] || function (d) { var g = !1, f = !1, m = { initialize: !0, queue: [], sv: "4", version: 2, config: d }; function v(e, t) { var n = {}, a = "Browser"; return n[E + "id"] = a[I](), n[E + "type"] = a, n["ai.operation.name"] = S && S.pathname || "_unknown_", n["ai.internal.sdkVersion"] = "javascript:snippet_" + (m.sv || m.version), { time: function () { var e = new Date; function t(e) { var t = "" + e; return 1 === t.length && (t = "0" + t), t } return e.getUTCFullYear() + "-" + t(1 + e.getUTCMonth()) + "-" + t(e.getUTCDate()) + "T" + t(e.getUTCHours()) + ":" + t(e.getUTCMinutes()) + ":" + t(e.getUTCSeconds()) + "." + ((e.getUTCMilliseconds() / 1e3).toFixed(3) + "").slice(2, 5) + "Z" }(), iKey: e, name: "Microsoft.ApplicationInsights." + e.replace(/-/g, "") + "." + t, sampleRate: 100, tags: n, data: { baseData: { ver: 2 } } } } var h = d.url || y.src; if (h) { function a(e) { var t, n, a, i, r, o, s, c, p, l, u; g = !0, m.queue = [], f || (f = !0, t = h, s = function () { var e = {}, t = d.connectionString; if (t) for (var n = t.split(";"), a = 0; a < n.length; a++) { var i = n[a].split("="); 2 === i.length && (e[i[0][I]()] = i[1]) } if (!e[D]) { var r = e.endpointsuffix, o = r ? e.location : null; e[D] = "https://" + (o ? o + "." : "") + "dc." + (r || "services.visualstudio.com") } return e }(), c = s[k] || d[k] || "", p = s[D], l = p ? p + "/v2/track" : config.endpointUrl, (u = []).push((n = "SDK LOAD Failure: Failed to load Application Insights SDK script (See stack for details)", a = t, i = l, (o = (r = v(c, "Exception")).data).baseType = "ExceptionData", o.baseData.exceptions = [{ typeName: "SDKLoadFailed", message: n.replace(/\\./g, "-"), hasFullStack: !1, stack: n + "\\nSnippet failed to load [" + a + "] -- Telemetry is disabled\\nHelp Link: https://go.microsoft.com/fwlink/?linkid=2128109\\nHost: " + (S && S.pathname || "_unknown_") + "\\nEndpoint: " + i, parsedStack: [] }], r)), u.push(function (e, t, n, a) { var i = v(c, "Message"), r = i.data; r.baseType = "MessageData"; var o = r.baseData; return o.message = \'AI(Internal): 99 message: "\' + ("SDK LOAD Failure: Failed to load Application Insights SDK script(See stack for details) (" + n + ")").replace(/\"/g, "") + \'"\', o.properties = { endpoint: a }, i }(0, 0, t, l)), function (e, t) { if (JSON) { var n = T.fetch; if (n && !y.useXhr) n(t, { method: w, body: JSON.stringify(e), mode: "cors" }); else if (XMLHttpRequest) { var a = new XMLHttpRequest; a.open(w, t), a.setRequestHeader("Content-type", "application/json"), a.send(JSON.stringify(e)) } } }(u, l)) } function i(e, t) { f || setTimeout(function () { !t && m.core || a() }, 500) } var e = function () { var n = l.createElement(u); n.src = h; var e = y[b]; return !e && "" !== e || "undefined" == n[b] || (n[b] = e), n.onload = i, n.onerror = a, n.onreadystatechange = function (e, t) { "loaded" !== n.readyState && "complete" !== n.readyState || i(0, t) }, n }(); y.ld < 0 ? l.getElementsByTagName("head")[0].appendChild(e) : setTimeout(function () { l.getElementsByTagName(u)[0].parentNode.appendChild(e) }, y.ld || 0) } try { m.cookie = l.cookie } catch (p) { } function t(e) { for (; e.length;)!function (t) { m[t] = function () { var e = arguments; g || m.queue.push(function () { m[t].apply(m, e) }) } }(e.pop()) } var n = "track", r = "TrackPage", o = "TrackEvent"; t([n + "Event", n + "PageView", n + "Exception", n + "Trace", n + "DependencyData", n + "Metric", n + "PageViewPerformance", "start" + r, "stop" + r, "start" + o, "stop" + o, "addTelemetryInitializer", "setAuthenticatedUserContext", "clearAuthenticatedUserContext", "flush"]), m.SeverityLevel = { Verbose: 0, Information: 1, Warning: 2, Error: 3, Critical: 4 }; var s = (d.extensionConfig || {}).ApplicationInsightsAnalytics || {}; if (!0 !== d[C] && !0 !== s[C]) { method = "onerror", t(["_" + method]); var c = T[method]; T[method] = function (e, t, n, a, i) { var r = c && c(e, t, n, a, i); return !0 !== r && m["_" + method]({ message: e, url: t, lineNumber: n, columnNumber: a, error: i }), r }, d.autoExceptionInstrumented = !0 } return m }(y.cfg); (T[t] = n).queue && 0 === n.queue.length && n.trackPageView({}) }(window, document, {' +
            'src: "' + WebSnippet._aiUrl + '",' +
            'cfg: {' +
            'instrumentationKey: "' + client.config.instrumentationKey + '"}});</script>';
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

    private _initialize() {
        this._isInitialized = true;
        const originalHttpServer = http.createServer;
        http.createServer = (requestListener?: (request: http.IncomingMessage, response: http.ServerResponse) => void) => {
            const originalRequestListener = requestListener;
            if (originalRequestListener) {
                requestListener = (request: http.IncomingMessage, response: http.ServerResponse) => {
                    // Patch response write method
                    let originalResponseWrite = response.write;
                    response.write = function wrap(a: Buffer | string, b?: Function | string, c?: Function | string) {
                        if (this._isEnabled) {
                            if (WebSnippet.ValidateInjection(response, a)) {
                                arguments[0] = WebSnippet.InjectWebSnippet(response, a);
                            }
                        }
                        return originalResponseWrite.apply(response, arguments);
                    }
                    // Patch response end method for cases when HTML is added there
                    let originalResponseEnd = response.end;
                    response.end = function wrap(a?: Buffer | string | any, b?: Function | string, c?: Function) {
                        if (this._isEnabled) {
                            if (WebSnippet.ValidateInjection(response, a)) {
                                arguments[0] = WebSnippet.InjectWebSnippet(response, a);
                            }
                        }
                        originalResponseEnd.apply(response, arguments);
                    }

                    originalRequestListener(request, response);
                }
            }
            return originalHttpServer(requestListener);
        }
    }

    /**
     * Validate response and try to inject Web snippet
     */
    public static ValidateInjection(response: http.ServerResponse, input: string | Buffer): boolean {
        if (response && input) {
            let contentType = response.getHeader('Content-Type');
            let contentEncoding = response.getHeader('Content-Encoding'); // Compressed content not supported for injection
            if (!contentEncoding && contentType && contentType.toLowerCase().indexOf("text/html") >= 0) {
                let html = input.toString();
                if (html.indexOf("<head>") >= 0 && html.indexOf("</head>") >= 0) {
                    // Check if snippet not already present looking for AI Web SDK URL
                    if (html.indexOf(WebSnippet._aiUrl) < 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * Inject Web snippet
     */
    public static InjectWebSnippet(response: http.ServerResponse, input: string | Buffer): string | Buffer {
        try {
            // Clean content-length header
            response.removeHeader('Content-Length');
            // Read response stream
            let html = input.toString();
            // Try to add script before HTML head closure
            let index = html.indexOf("</head>");
            if (index >= 0) {
                let subStart = html.substring(0, index);
                let subEnd = html.substring(index);
                input = subStart + WebSnippet._snippet + subEnd;
                // Set headers
                response.setHeader("Content-Length", input.length.toString());
            }
        }
        catch (ex) {
            Logging.info("Failed to change content-lenght headers for JS injection. Exception:" + ex);
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
