# Application Insights for Node.js

[![NPM version](https://badge.fury.io/js/applicationinsights.svg)](http://badge.fury.io/js/applicationinsights)
[![Build Status](https://travis-ci.org/Microsoft/ApplicationInsights-node.js.svg?branch=master)](https://travis-ci.org/Microsoft/ApplicationInsights-node.js)



This project provides a [Visual Studio Application Insights](https://azure.microsoft.com/documentation/articles/app-insights-overview/) SDK for [Node.js](https://nodejs.org/). The SDK sends telemetry about the performance and usage of your live Node.js application to the Application Insights service. There you can analyze charts of request rates, response times, failures and dependencies, and diagnose issues using powerful search and aggregation tools.

The SDK provides automatic collection of incoming HTTP request rates and responses, performance counters (CPU, memory, RPS), and unhandled exceptions. In addition, you can add custom calls to track dependencies, metrics, or other events.


## Requirements ##
**Install**
```
npm install applicationinsights
```

### Get an instrumentation key

[Create an Application Insights resource](https://azure.microsoft.com/documentation/articles/app-insights-create-new-resource/) where your telemetry will be displayed. This provides you with an instrumentation key that identifies the resource. (You can try the SDK without sending telemetry: set the instrumentation key to a non-empty string.)


## Usage ##

This will enable request monitoring, unhandled exception tracking, and system performance monitoring (CPU/Memory/RPS).

```javascript
import appInsights = require("applicationinsights");
appInsights.setup("<instrumentation_key>").start();
```

>The instrumentation key can also be set in the environment variable APPINSIGHTS_INSTRUMENTATIONKEY. If this is done, no argument is required when calling `appInsights.setup()` or `appInsights.getClient()`.



## Customized Usage ##

### Disabling auto-collection

```javascript
import appInsights = require("applicationinsights");
appInsights.setup("<instrumentation_key>")
    .setAutoCollectRequests(false)
    .setAutoCollectPerformance(false)
    .setAutoCollectExceptions(false)
    // no telemetry will be sent until .start() is called
    .start();
```

### Custom monitoring

```javascript
import appInsights = require("applicationinsights");
var client = appInsights.getClient();

client.trackEvent("custom event", {customProperty: "custom property value"});
client.trackException(new Error("handled exceptions can be logged with this method"));
client.trackMetric("custom metric", 3);
client.trackTrace("trace message");
```

### Telemetry Processor

```javascript
public addTelemetryProcessor(telemetryProcessor: (envelope: ContractsModule.Contracts.Envelope) => boolean)
```

Adds a telemetry processor to the collection. Telemetry processors will be called one by one, in the order they were added, before the telemetry item is pushed for sending. 
If one of the telemetry processors returns false then the telemetry item will not be sent. 
If one of the telemetry processors throws an error then the telemetry item will not be sent.

**Example**

Add the below code before you send any telemetry, it will remove stack trace information from any Exception reported by the SDK.

```javascript
appInsights.client.addTelemetryProcessor((envelope) => {
    if (envelope.data.baseType === "Microsoft.ApplicationInsights.ExceptionData") {
        var data = envelope.data.baseData;
        if (data.exceptions && data.exceptions.length > 0) {
            for(var i = 0; i < data.exceptions.length; i++) {
                var exception = data.exceptions[i];
                exception.parsedStack = null;
                exception.hasFullStack = false;
            }
        }
    }
    return true;
});
```

[Learn more about the telemetry API](https://azure.microsoft.com/documentation/articles/app-insights-api-custom-events-metrics/).

### Using multiple instrumentation keys

```javascript
import appInsights = require("applicationinsights");

// configure auto-collection with one instrumentation key
appInsights.setup("<instrumentation_key>").start();

// get a client for another instrumentation key
var otherClient = appInsights.getClient("<other_instrumentation_key>");
otherClient.trackEvent("custom event");
```

## Examples

### Tracking dependency

```javascript
import appInsights = require("applicationinsights");
var client = appInsights.getClient();

var startTime = Date.now();
// execute dependency call
var endTime = Date.now();

var elapsedTime = endTime - startTime;
var success = true;
client.trackDependency("dependency name", "command name", elapsedTime, success);
```



### Manual request tracking of all "GET" requests

```javascript
var http = require("http");
var appInsights = require("applicationinsights");
appInsights.setup("<instrumentation_key>")
    .setAutoCollectRequests(false) // disable auto-collection of requests for this example
    .start();

// assign common properties to all telemetry sent from the default client
appInsights.client.commonProperties = {
    environment: process.env.SOME_ENV_VARIABLE
};

// track a system startup event
appInsights.client.trackEvent("server start");

// create server
var port = process.env.port || 1337
var server = http.createServer(function (req, res) {
    // track all "GET" requests
    if(req.method === "GET") {
        appInsights.client.trackRequest(req, res);
    }

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Hello World\n");
}).listen(port);

// track startup time of the server as a custom metric
var start = +new Date;
server.on("listening", () => {
    var end = +new Date;
    var duration = end - start;
    appInsights.client.trackMetric("StartupTime", duration);
});
```


## Branches

- [master](https://github.com/Microsoft/ApplicationInsights-node.js/tree/master) contains the *latest* published release located on [NPM](https://www.npmjs.com/package/applicationinsights).
- [develop](https://github.com/Microsoft/ApplicationInsights-node.js/tree/develop) contains the code for the *next* release. Please send all pull requests to this branch.  

## Links

* Follow the latest Application Insights changes and announcements on [ApplicationInsights Announcements](https://github.com/Microsoft/ApplicationInsights-Announcements)

## Contributing

**Development environment**

* Install dev dependencies
    
    ```
    npm install 
    ```
* (optional) Set an environment variable to your instrumentation key
    
    ```
    set APPINSIGHTS_INSTRUMENTATIONKEY=<insert_your_instrumentation_key_here>
    ```
* Run tests
    
    ```
    npm test
    ```

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
