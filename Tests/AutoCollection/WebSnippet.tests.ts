import assert = require("assert");
import http = require("http");
import sinon = require("sinon");

import AppInsights = require("../../applicationinsights");
import WebSnippet = require("../../AutoCollection/WebSnippet");

describe("AutoCollection/WebSnippet", () => {
    afterEach(() => {
        AppInsights.dispose();
    });

    describe("#init and #dispose()", () => {
        it("init should enable and dispose should stop injection", () => {
            var appInsights = AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").setWebSnippetInjection(true);
            var enableWebSnippetsSpy = sinon.spy(WebSnippet.INSTANCE, "enable");
            appInsights.start();

            assert.equal(enableWebSnippetsSpy.callCount, 1, "enable should be called once as part of requests autocollection initialization");
            assert.equal(enableWebSnippetsSpy.getCall(0).args[0], true);
            AppInsights.dispose();
            assert.equal(enableWebSnippetsSpy.callCount, 2, "enable(false) should be called once as part of requests autocollection shutdown");
            assert.equal(enableWebSnippetsSpy.getCall(1).args[0], false);
        });
    });

    describe("#validate response", () => {
        it("injection should be triggered only in HTML responses", () => {
            let _headers: any = {};
            let response: http.ServerResponse = <any>{
                setHeader: (header: string, value: string) => {
                    _headers[header] = value;
                },
                getHeader: (header: string) => { return _headers[header]; }
            };
            let validHtml = "<html><head></head><body></body></html>";
            assert.equal(WebSnippet.ValidateInjection(response, validHtml), false); // No html header
            response.setHeader("Content-Type", "text/html");
            assert.equal(WebSnippet.ValidateInjection(response, validHtml), true); // Valid
            assert.equal(WebSnippet.ValidateInjection(response, "test"), false); // No html text
            assert.equal(WebSnippet.ValidateInjection(response, "<html><body></body></html>"), false); // No head element
            response.setHeader("Content-Type", "text/plain");
            assert.equal(WebSnippet.ValidateInjection(response, validHtml), false); // No HTML content type
            response.setHeader("Content-Type", "text/html");
            response.setHeader("Content-Encoding", "gzip");
            assert.equal(WebSnippet.ValidateInjection(response, validHtml), false); // Encoding not supported
        });
    });

    describe("#web snippet injection", () => {
        it("injection add correct snippet code", () => {
            let _headers: any = {};
            let response: http.ServerResponse = <any>{
                setHeader: (header: string, value: string) => {
                    _headers[header] = value;
                },
                getHeader: (header: string) => { return _headers[header]; },
                removeHeader: (header: string) => { _headers[header] = undefined; }
            };
            var appInsights = AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").setAutoCollectRequests(true);
            let validHtml = "<html><head></head><body></body></html>";
            let snippet = '<script type="text/javascript">' +
                '!function (T, l, y) { var S = T.location, u = "script", k = "instrumentationKey", D = "ingestionendpoint", C = "disableExceptionTracking", E = "ai.device.", I = "toLowerCase", b = "crossOrigin", w = "POST", e = "appInsightsSDK", t = y.name || "appInsights"; (y.name || T[e]) && (T[e] = t); var n = T[t] || function (d) { var g = !1, f = !1, m = { initialize: !0, queue: [], sv: "4", version: 2, config: d }; function v(e, t) { var n = {}, a = "Browser"; return n[E + "id"] = a[I](), n[E + "type"] = a, n["ai.operation.name"] = S && S.pathname || "_unknown_", n["ai.internal.sdkVersion"] = "javascript:snippet_" + (m.sv || m.version), { time: function () { var e = new Date; function t(e) { var t = "" + e; return 1 === t.length && (t = "0" + t), t } return e.getUTCFullYear() + "-" + t(1 + e.getUTCMonth()) + "-" + t(e.getUTCDate()) + "T" + t(e.getUTCHours()) + ":" + t(e.getUTCMinutes()) + ":" + t(e.getUTCSeconds()) + "." + ((e.getUTCMilliseconds() / 1e3).toFixed(3) + "").slice(2, 5) + "Z" }(), iKey: e, name: "Microsoft.ApplicationInsights." + e.replace(/-/g, "") + "." + t, sampleRate: 100, tags: n, data: { baseData: { ver: 2 } } } } var h = d.url || y.src; if (h) { function a(e) { var t, n, a, i, r, o, s, c, p, l, u; g = !0, m.queue = [], f || (f = !0, t = h, s = function () { var e = {}, t = d.connectionString; if (t) for (var n = t.split(";"), a = 0; a < n.length; a++) { var i = n[a].split("="); 2 === i.length && (e[i[0][I]()] = i[1]) } if (!e[D]) { var r = e.endpointsuffix, o = r ? e.location : null; e[D] = "https://" + (o ? o + "." : "") + "dc." + (r || "services.visualstudio.com") } return e }(), c = s[k] || d[k] || "", p = s[D], l = p ? p + "/v2/track" : config.endpointUrl, (u = []).push((n = "SDK LOAD Failure: Failed to load Application Insights SDK script (See stack for details)", a = t, i = l, (o = (r = v(c, "Exception")).data).baseType = "ExceptionData", o.baseData.exceptions = [{ typeName: "SDKLoadFailed", message: n.replace(/\\./g, "-"), hasFullStack: !1, stack: n + "\\nSnippet failed to load [" + a + "] -- Telemetry is disabled\\nHelp Link: https://go.microsoft.com/fwlink/?linkid=2128109\\nHost: " + (S && S.pathname || "_unknown_") + "\\nEndpoint: " + i, parsedStack: [] }], r)), u.push(function (e, t, n, a) { var i = v(c, "Message"), r = i.data; r.baseType = "MessageData"; var o = r.baseData; return o.message = \'AI(Internal): 99 message: "\' + ("SDK LOAD Failure: Failed to load Application Insights SDK script(See stack for details) (" + n + ")").replace(/\"/g, "") + \'"\', o.properties = { endpoint: a }, i }(0, 0, t, l)), function (e, t) { if (JSON) { var n = T.fetch; if (n && !y.useXhr) n(t, { method: w, body: JSON.stringify(e), mode: "cors" }); else if (XMLHttpRequest) { var a = new XMLHttpRequest; a.open(w, t), a.setRequestHeader("Content-type", "application/json"), a.send(JSON.stringify(e)) } } }(u, l)) } function i(e, t) { f || setTimeout(function () { !t && m.core || a() }, 500) } var e = function () { var n = l.createElement(u); n.src = h; var e = y[b]; return !e && "" !== e || "undefined" == n[b] || (n[b] = e), n.onload = i, n.onerror = a, n.onreadystatechange = function (e, t) { "loaded" !== n.readyState && "complete" !== n.readyState || i(0, t) }, n }(); y.ld < 0 ? l.getElementsByTagName("head")[0].appendChild(e) : setTimeout(function () { l.getElementsByTagName(u)[0].parentNode.appendChild(e) }, y.ld || 0) } try { m.cookie = l.cookie } catch (p) { } function t(e) { for (; e.length;)!function (t) { m[t] = function () { var e = arguments; g || m.queue.push(function () { m[t].apply(m, e) }) } }(e.pop()) } var n = "track", r = "TrackPage", o = "TrackEvent"; t([n + "Event", n + "PageView", n + "Exception", n + "Trace", n + "DependencyData", n + "Metric", n + "PageViewPerformance", "start" + r, "stop" + r, "start" + o, "stop" + o, "addTelemetryInitializer", "setAuthenticatedUserContext", "clearAuthenticatedUserContext", "flush"]), m.SeverityLevel = { Verbose: 0, Information: 1, Warning: 2, Error: 3, Critical: 4 }; var s = (d.extensionConfig || {}).ApplicationInsightsAnalytics || {}; if (!0 !== d[C] && !0 !== s[C]) { method = "onerror", t(["_" + method]); var c = T[method]; T[method] = function (e, t, n, a, i) { var r = c && c(e, t, n, a, i); return !0 !== r && m["_" + method]({ message: e, url: t, lineNumber: n, columnNumber: a, error: i }), r }, d.autoExceptionInstrumented = !0 } return m }(y.cfg); (T[t] = n).queue && 0 === n.queue.length && n.trackPageView({}) }(window, document, {' +
                'src: "https://az416426.vo.msecnd.net/scripts/b/ai.2.min.js",' +
                'cfg: {' +
                'instrumentationKey: "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"}});</script>';
            assert.equal(WebSnippet.InjectWebSnippet(response, validHtml), "<html><head>" + snippet + "</head><body></body></html>"); // Correct injection
            assert.equal(response.getHeader("Content-Length"), "4671"); // Content length updated
        });
    });

});