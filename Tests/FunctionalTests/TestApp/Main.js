var Config = require("./Config");
var appInsights = null;
if (Config.AppInsightsEnabled) {
    appInsights = require("applicationinsights");
    appInsights.setup(Config.InstrumentationKey);
    appInsights.defaultClient.config.endpointUrl = Config.EndpointBaseAddress+"/v2/track";
    appInsights.defaultClient.config.profileQueryEndpoint = Config.EndpointBaseAddress;
    appInsights.defaultClient.config.samplingPercentage = parseFloat(Config.SampleRate);
    appInsights.Configuration.setAutoDependencyCorrelation(Config.UseAutoCorrelation);
    appInsights.Configuration.setAutoCollectRequests(Config.UseAutoRequests);
    appInsights.Configuration.setAutoCollectPerformance(Config.UseAutoPerformance);
    appInsights.Configuration.setAutoCollectExceptions(Config.UseAutoExceptions);
    appInsights.Configuration.setAutoCollectDependencies(Config.UseAutoDependencies);
    appInsights.Configuration.setAutoCollectConsole(Config.UseAutoConsole, Config.UseAutoConsoleLog);
    appInsights.Configuration.setUseDiskRetryCaching(Config.UseDiskCaching);
    appInsights.start();
}

var Tasks = require("./Tasks");
var MySQL = require("./Tasks/MySQL"); // HACK! This takes a long time! So don't send "OK" until it's ready
var port = parseInt(Config.ServerPort);
var bodyParser = require('body-parser');
var express = require("express");
var http = require("http");
var app = express();
app.use(bodyParser.json());

app.get("/", (req, res) => {
    if (MySQL.isReady()) {
        res.send("OK");
    } else {
        res.send("NOT OK");
    }
});

/**
 * Receive route configuration object of the following form as POST body:
 * [
 * {path: "/dependencyTest", steps:["HttpGet", "Timeout", "MongoInsert"]},
 * ...
 * ]
 * 
 * This input will create routes on this server that perform those tasks.
 * The available tasks are defined in /Tasks/index.js
 */
app.post("/_configure", (req, res) => {
    var stepConfig = req.body;

    var runTasks = (tasks, cb) => {
        if (!tasks || tasks.length == 0) {
            cb();
            return;
        }
        tasks = tasks.slice(0);
        var task = tasks.shift();
        Tasks[task](()=>runTasks(tasks, cb));
    }

    var generateStepRoute = (route) => {
        app.get(route.path, (rq, rs) => {
            runTasks(route.steps, ()=>rs.send("OK"));
        });
    }

    for (var i=0; i < stepConfig.length; i++) {
        generateStepRoute(stepConfig[i]);
    }

    res.send("OK");
});

app.get("/_close", (req, res) => {
    res.end("OK");
    server.close();
    if (Config.AppInsightsEnabled) {
        appInsights.defaultClient.flush();
        appInsights.dispose();
        process.exit(0);
    }
});

var server = app.listen(port, () => {
    console.log("TestApp Ready!");
});