var testconfig = require("./config");
var appInsights = null;
if (testconfig.AppInsightsEnabled) {

    const { Client, Config } = require("applicationinsights");

    let config = new Config(`InstrumentationKey=${testconfig.InstrumentationKey};IngestionEndpoint=${testconfig.EndpointBaseAddress}`);
    config.samplingRate = parseFloat(testconfig.SampleRate);
    config.instrumentations["http"].enabled = true;
    config.instrumentations["azureSdk"].enabled = true;
    config.instrumentations["mongoDb"].enabled = true;
    config.instrumentations["mySql"].enabled = true;
    config.instrumentations["postgreSql"].enabled = true;
    config.instrumentations["redis"].enabled = true;
    config.instrumentations["redis4"].enabled = true;
    config.enableAutoCollectExceptions = true;
    config.enableAutoCollectConsole = true;
    config.enableAutoCollectExternalLoggers = true;

    appInsights = new Client(config);
    appInsights.start();
}

var Tasks = require("./tasks");
var port = parseInt(testconfig.ServerPort);
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
    if (testconfig.AppInsightsEnabled) {
        appInsights.flush();
        appInsights.shutdown();
        process.exit(0);
    }
});

var server = app.listen(port, () => {
    console.log("TestApp Ready!");
});