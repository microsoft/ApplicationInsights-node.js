var Config } from "../Config");

var appInsights = null;
if (Config.AppInsightsEnabled) {
    appInsights } from "applicationinsights");
}

function wrap(fn) {
    return (cb) => {
        if (Config.AppInsightsEnabled) {
            fn();
        }
        cb();
        return;
    }
}

module.exports = {
    trackDependency: wrap(()=>appInsights.defaultClient.trackDependency({name: "Manual dependency", dependencyTypeName: "Manual", duration: 200, success: true})),
    trackException: wrap(()=>appInsights.defaultClient.trackException({exception: new Error("Manual track error")})),
    trackTrace: wrap(()=>appInsights.defaultClient.trackTrace({message: "Manual track trace"}))
}