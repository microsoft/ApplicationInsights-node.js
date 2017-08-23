/*
This standalone console app is created to verify non web-server scenarios
*/

import appInsights = require("../../../");

// https://github.com/Microsoft/ApplicationInsights-node.js/issues/54
var testAppExitsAfterSendingTelemetry = () => {
    var c = appInsights.getClient("key");
    c.trackEvent('some event', { 'version': 'foo' });
    //c.sendPendingData();
    console.log('All done');
}

testAppExitsAfterSendingTelemetry();