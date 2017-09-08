import express = require('express');
import url = require('url');
import http = require('http');
import appInsights = require("../../../");

import path = require('path');
import httpDependency = require("./httpDependency");
import redisDependency = require("./redisDependency");


const app = express();

// Constants
const PORT = 8080;

appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY || "test").start().setAutoDependencyCorrelation(true);
appInsights.Configuration.setInternalLogging(true);

var appInsightsClient = appInsights.defaultClient;

app.get('/', (req, res) => {
    res.send(
        "<html>" +
        " <title>Node.JS SDK Sample Application</title>" +
        "  <body>" +
        "   <h3>Scenarios:</h3>" +
        "   <p>" +
        "    <ul>" +
        "     <li><a href='/http?s=msft'>HTTP Dependency</a></li>" +
        "     <li><a href='/redis'>Redis Dependency</a></li>" +
        "    </ul>" +
        "   </p>" +
        "   <p>" +
        "    <span>ikey: " + appInsights.defaultClient.config.instrumentationKey + "<span>" +
        "   </p>" +
        "  </body>" +
        "</html>");

});

app.get('/http', ((req, res) => httpDependency.generateHttpDependency(req, res)));
app.get('/redis', ((req, res) => redisDependency.generateRedisDepdendency(req, res)));


app.listen(PORT, function () {
    appInsightsClient.trackEvent({ name: "AppStartListen" });
    console.log('Now listening on port ' + PORT.toString() + '!');
})