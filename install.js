/**
* runs on on install
* creates a file in the directory above npm called "ai.config" based on the config.json template, to be instrumented by the user
* pulls javascript sdk from CDN, writes the content to a js file called ai.js and appends list of exports to be used by appInsights
*/

config = require('./config.json');
var fs = require('fs');
var http = require('http');


//create full ai.js file locally from cdn
var file = fs.createWriteStream("ai.js");

var instrumentation = "var config = require('../../ai.config.json'); \r\n\
var iKey = config && config.profiles && config.profiles.defaults && config.profiles.defaults.iKey; \r\n\
appInsights = { iKey: iKey };\r\n\r\n";
file.write(instrumentation, function (err) { });

http.get("http://az639152.vo.msecnd.net/cdntest/a/ai.0.10.0.js", function (response) {
    var r = response.pipe(file);
    r.on('finish', addExports);
});

//append node required exports to ai.js
function addExports() {
    var exportString = "\r\nmodule.exports = {\r\niKey: appInsights.iKey, context: appInsights.context,\r\nTraceTelemetry: Microsoft.ApplicationInsights.TraceTelemetry,\r\nExceptionTelemetry: Microsoft.ApplicationInsights.ExceptionTelemetry,\r\nRequestTelemetry: Microsoft.ApplicationInsights.RequestTelemetry,\r\nRequestData: Microsoft.ApplicationInsights.RequestData,\r\nExceptionData: Microsoft.ApplicationInsights.ExceptionData,\r\n}";
    fs.appendFile("ai.js", exportString, function(err) {});
}

//create full ai.d.ts file locally from cdn
var dfile = fs.createWriteStream("ai.d.ts");
http.get("http://az639152.vo.msecnd.net/cdntest/ai.d.ts", function (response) {
    var r = response.pipe(dfile);
});

//create ai.config.json file in user's project file
var outputFilename = '../../ai.config.json';
fs.writeFile(outputFilename, JSON.stringify(config, null, 4), function (err) {
    if (err) {
        console.log(err);
    } else {
        console.log("ai.config.json created");
    }
});
console.log("installed!");