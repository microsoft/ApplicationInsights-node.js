import https = require('https');
import url = require('url');

class CorrelationIdManager {
    public static correlationIdPrefix: "cid-v1:";

    private static pendingLookups: {[key: string]: Function[]} = {};
    private static completedLookups: {[key: string]: string} = {};

    public static queryCorrelationId(endpointBase: string, instrumentationKey: string, correlationIdRetryInterval: number, callback: (correlationId: string) => void) {
        // GET request to `${this.endpointBase}/api/profiles/${this.instrumentationKey}/appId`
        // If it 404s, the iKey is bad and we should give up
        // If it fails otherwise, try again later
        const appIdUrlString = `${endpointBase}/api/profiles/${instrumentationKey}/appId`;
        const appIdUrl = url.parse(appIdUrlString);

        if (CorrelationIdManager.completedLookups[appIdUrlString]) {
            callback(CorrelationIdManager.completedLookups[appIdUrlString]);
            return;
        } else if (CorrelationIdManager.pendingLookups[appIdUrlString]) {
            CorrelationIdManager.pendingLookups[appIdUrlString].push(callback);
            return;
        }

        CorrelationIdManager.pendingLookups[appIdUrlString] = [callback];

        const requestOptions = {
            protocol: appIdUrl.protocol,
            hostname: appIdUrl.host,
            path: appIdUrl.pathname,
            method: 'GET',
            // Ensure this request is not captured by auto-collection.
            // Note: we don't refer to the property in ClientRequestParser because that would cause a cyclical dependency
            disableAppInsightsAutoCollection: true
        };

        const fetchAppId = () => {
            const req = https.request(requestOptions, (res) => {
                if (res.statusCode === 200) {
                    // Success; extract the appId from the body
                    let appId = "";
                    res.setEncoding("utf-8");
                    res.on('data', function (data) {
                        appId += data;
                    });
                    res.on('end', () => {
                        const result = CorrelationIdManager.correlationIdPrefix + appId;
                        CorrelationIdManager.completedLookups[appIdUrlString] = result;
                        CorrelationIdManager.pendingLookups[appIdUrlString].forEach((cb) => cb(result));
                        delete CorrelationIdManager.pendingLookups[appIdUrlString];
                    });
                } else if (res.statusCode >= 400 && res.statusCode < 500) {
                    // Not found, probably a bad key. Do not try again.
                } else {
                    // Retry after timeout.
                    setTimeout(fetchAppId, correlationIdRetryInterval);
                }
            });
            if (req) {
                req.end();
            }
        };
        fetchAppId();
    }
}

export = CorrelationIdManager;