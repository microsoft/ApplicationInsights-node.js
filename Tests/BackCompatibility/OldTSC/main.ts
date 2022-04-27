import appInsights = require("applicationinsights");
import http = require("http");

appInsights.setup().start();
appInsights.defaultClient.trackEvent({ name: "Test event" });
appInsights.defaultClient.trackNodeHttpDependency({ options: {}, request: http.request({}) });
