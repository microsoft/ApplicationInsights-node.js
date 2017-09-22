import appInsights = require("applicationinsights");

appInsights.setup().start();
appInsights.defaultClient.trackEvent({name: "Test event"});