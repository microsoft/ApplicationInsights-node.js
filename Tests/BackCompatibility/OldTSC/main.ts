import appInsights } from "applicationinsights");
import http } from "http");

appInsights.setup().start();
appInsights.defaultClient.trackEvent({name: "Test event"});
appInsights.defaultClient.trackNodeHttpDependency({options: {}, request: http.request({})});