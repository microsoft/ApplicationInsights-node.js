/*
This standalone console app is created to verify non web-server scenarios
*/

import appInsights = require("../../../");

// https://github.com/Microsoft/ApplicationInsights-node.js/issues/54
var testAppExitsAfterSendingTelemetry = () => {
    var c = new appInsights.TelemetryClient("key");
    c.trackEvent({name:'some event', properties: { 'version': 'foo' }});
    //c.flush();
    console.log('All done');
}

testAppExitsAfterSendingTelemetry();