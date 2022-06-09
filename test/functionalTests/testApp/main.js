var Config = require("./config");
var appInsights = null;
if (Config.AppInsightsEnabled) {
    appInsights = require("applicationinsights");

    let testConnectionString = `InstrumentationKey=${Config.InstrumentationKey};IngestionEndpoint=${Config.EndpointBaseAddress}`;

    appInsights.setup(testConnectionString);
    appInsights.defaultClient.config.samplingPercentage = parseFloat(Config.SampleRate);
    appInsights.defaultClient.config.instrumentations["azureSdk"].enabled = true;
    appInsights.defaultClient.config.instrumentations["mongoDb"].enabled = true;
    appInsights.defaultClient.config.instrumentations["mySql"].enabled = true;
    appInsights.defaultClient.config.instrumentations["postgreSql"].enabled = true;
    appInsights.defaultClient.config.instrumentations["redis"].enabled = true;
    appInsights.defaultClient.config.instrumentations["redis4"].enabled = true;

    appInsights.defaultClient.config.enableAutoCollectDependencies = true;
    appInsights.defaultClient.config.enableAutoCollectRequests = true;

    appInsights.start();
}

var Tasks = require("./tasks");
var port = parseInt(Config.ServerPort);
var bodyParser = require('body-parser');
var express = require("express");
var app = express();
app.use(bodyParser.json());

app.get("/", (req, res) => {
    res.send("OK");
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
        Tasks[task](() => runTasks(tasks, cb));
    }

    var generateStepRoute = (route) => {
        app.get(route.path, (rq, rs) => {
            runTasks(route.steps, () => rs.send("OK"));
        });
    }

    for (var i = 0; i < stepConfig.length; i++) {
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