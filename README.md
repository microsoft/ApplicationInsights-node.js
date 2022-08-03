# Application Insights for Node.js

[![npm version](https://badge.fury.io/js/applicationinsights.svg)](http://badge.fury.io/js/applicationinsights)
![Integration Tests CI](https://github.com/microsoft/ApplicationInsights-node.js/workflows/Integration%20Tests%20CI/badge.svg)
![Node.js CI](https://github.com/microsoft/ApplicationInsights-node.js/workflows/Node.js%20CI/badge.svg)
![Back Compatability CI](https://github.com/microsoft/ApplicationInsights-node.js/workflows/Back%20Compatability%20CI/badge.svg)

[Azure Application Insights][] monitors your backend services and components after
you deploy them to help you [discover and rapidly diagnose performance and other
issues][]. Add this SDK to your Node.js services to include deep info about Node.js
processes and their external dependencies such as database and cache services.
You can use this SDK for your Node.js services hosted anywhere: your datacenter,
Azure VMs and Web Apps, and even other public clouds.

[Azure Application Insights]: https://azure.microsoft.com/documentation/articles/app-insights-overview/
[discover and rapidly diagnose performance and other issues]: https://docs.microsoft.com/azure/application-insights/app-insights-detect-triage-diagnose

This library tracks the following out-of-the-box:
- Incoming and outgoing HTTP requests
- Important system metrics such as CPU usage
- Unhandled exceptions
- Events from many popular third-party libraries ([see Automatic third-party instrumentation](#automatic-third-party-instrumentation))

You can manually track more aspects of your app and system using the API described in the
[Track custom telemetry](#track-custom-telemetry) section.

## Supported Node.JS versions 

| Platform Version | Supported                                       |
|------------------|-------------------------------------------------|
| Node.JS `v16`    | ✅                                              |
| Node.JS `v15`    | ✅                                              |
| Node.JS `v14`    | ✅                                              |
| Node.JS `v12`    | ✅                                              |
| Node.JS `v10`    | ✅                                              |
| Node.JS `v8`     | ✅                                              |


## Getting Started

> *Important:* On March 31st, 2025, support for instrumentation key ingestion will end. Instrumentation key ingestion will continue to work, but we’ll no longer provide updates or support for the feature. [Transition to connection strings](https://docs.microsoft.com/en-us/azure/azure-monitor/app/migrate-from-instrumentation-keys-to-connection-strings) to take advantage of [new capabilities](https://docs.microsoft.com/en-us/azure/azure-monitor/app/migrate-from-instrumentation-keys-to-connection-strings#new-capabilities).

1. Create an Application Insights resource in Azure by following [these instructions][].
2. Grab the _Connection String_ from the resource you created in
   step 1. Later, you'll either add it to your app's environment variables or
   use it directly in your scripts.
3. Add the Application Insights Node.js SDK to your app's dependencies and
   package.json:
     ```bash
     npm install --save applicationinsights
     ```
     > *Note:* If you're using TypeScript, please install @types/node package to prevent build issues, this npm package contains built-in typings.
4. As early as possible in your app's code, load the Application Insights
   package:
     ```javascript
     let appInsights = require('applicationinsights');
     ```
5. Configure the local SDK by calling `appInsights.setup('YOUR_CONNECTION_STRING');`, using
   the connection string you grabbed in step 2. Or put it in the
   `APPLICATIONINSIGHTS_CONNECTION_STRING` environment variable and call
   `appInsights.setup()` without parameters.
   > For more configuration options see below.
6. Finally, start automatically collecting and sending data by calling
   `appInsights.start();`.

[these instructions]: https://docs.microsoft.com/azure/application-insights/app-insights-nodejs


## Basic Usage

> *Important:* `applicationinsights` must be setup *and* started *before* you import anything else. There may be resulting telemetry loss if other libraries are imported first.

For out-of-the-box collection of HTTP requests, popular third-party library events,
unhandled exceptions, and system metrics:

```javascript
let appInsights = require("applicationinsights");
appInsights.setup("YOUR_CONNECTION_STRING").start();
```

* If the connection string is set in the environment variable
  APPLICATIONINSIGHTS\_CONNECTION\_STRING, `.setup()` can be called with no
  arguments. This makes it easy to use different connection strings for different
  environments.

Load the Application Insights library (i.e. `require("applicationinsights")`) as
early as possible in your scripts, before loading other packages. This is needed
so that the Application Insights library can prepare later packages for tracking.
If you encounter conflicts with other libraries doing similar preparation, try
loading the Application Insights library after those.

Because of the way JavaScript handles callbacks, additional work is necessary to
track a request across external dependencies and later callbacks. By default
this additional tracking is enabled; disable it by calling
`setAutoDependencyCorrelation(false)` as described in the
Configuration section below.

## Azure Functions

Due to how Azure Functions (and other FaaS services) handle incoming requests, they are not seen as `http` requests to the Node.js runtime. For this reason, Request -> Dependency correlelation will **not** work out of the box.
To enable tracking here, you simply need to grab the context from your Function request handler, and wrap your Function with that context.

### Setting up Auto-Correlation for Azure Functions

You do not need to make any changes to your existing Function logic.
Instead, you can update the `default` export of your `httpTrigger` to be wrapped with some Application Insights logic:

```js
...

// Default export wrapped with Application Insights FaaS context propagation
export default async function contextPropagatingHttpTrigger(context, req) {
    // Start an AI Correlation Context using the provided Function context
    const correlationContext = appInsights.startOperation(context, req);

    // Wrap the Function runtime with correlationContext
    return appInsights.wrapWithCorrelationContext(async () => {
        const startTime = Date.now(); // Start trackRequest timer

        // Run the Function
        const result = await httpTrigger(context, req);

        // Track Request on completion
        appInsights.defaultClient.trackRequest({
            name: context.req.method + " " + context.req.url,
            resultCode: context.res.status,
            success: true,
            url: req.url,
            time: new Date(startTime),
            duration: Date.now() - startTime,
            id: correlationContext.operation.parentId,
        });
        appInsights.defaultClient.flush();

        return result;
    }, correlationContext)();
};
```

### Azure Functions Example

An example of making an `axios` call to <https://httpbin.org> and returning the reponse.

```js
const appInsights = require("applicationinsights");
appInsights.setup("<YOUR_CONNECTION_STRING>")
    .setAutoCollectPerformance(false)
    .start();

const axios = require("axios");

/**
 * No changes required to your existing Function logic
 */
const httpTrigger = async function (context, req) {
    const response = await axios.get("https://httpbin.org/status/200");

    context.res = {
        status: response.status,
        body: response.statusText,
    };
};

// Default export wrapped with Application Insights FaaS context propagation
export default async function contextPropagatingHttpTrigger(context, req) {
    // Start an AI Correlation Context using the provided Function context
    const correlationContext = appInsights.startOperation(context, req);

    // Wrap the Function runtime with correlationContext
    return appInsights.wrapWithCorrelationContext(async () => {
        const startTime = Date.now(); // Start trackRequest timer

        // Run the Function
        const result = await httpTrigger(context, req);

        // Track Request on completion
        appInsights.defaultClient.trackRequest({
            name: context.req.method + " " + context.req.url,
            resultCode: context.res.status,
            success: true,
            url: req.url,
            time: new Date(startTime),
            duration: Date.now() - startTime,
            id: correlationContext.operation.parentId,
        });
        appInsights.defaultClient.flush();

        return result;
    }, correlationContext)();
};
```

## Configuration

The appInsights object provides a number of methods to setup SDK behavior. They are
listed in the following snippet with their default values.

```javascript
let appInsights = require("applicationinsights");
appInsights.setup("<YOUR_CONNECTION_STRING>")
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true, false)
    .setUseDiskRetryCaching(true)
    .setAutoCollectPreAggregatedMetrics(true)
    .setSendLiveMetrics(false)
    .setAutoCollectHeartbeat(false)
    .setInternalLogging(false, true)
    .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
    .enableAutoWebSnippetInjection(false)
    .start();
```

Please review their descriptions in your IDE's built-in type hinting, or [applicationinsights.ts](https://github.com/microsoft/ApplicationInsights-node.js/tree/develop/applicationinsights.ts) for
detailed information on what these control, and optional secondary arguments.

Note that by default `setAutoCollectConsole` is configured to *exclude* calls to `console.log`
(and other `console` methods). By default, only calls to supported third-party loggers
(e.g. `winston`, `bunyan`) will be collected. You can change this behavior to *include* calls
to `console` methods by using `setAutoCollectConsole(true, true)`.

Note that by default `enableAutoWebSnippetInjection` will use the connection string for SDK initialization. If you want to use a different one, you can set it as `enableAutoWebSnippetInjection(true, "your-connection-string")`.

The TelemetryClient object contains a `config` property with many optional settings. These can be set as follows:
```
client.config.PROPERTYNAME = VALUE;
```
These properties are client specific, so you can configure `appInsights.defaultClient`
separately from clients created with `new appInsights.TelemetryClient()`.

| Property                        | Description                                                                                                |
| ------------------------------- |------------------------------------------------------------------------------------------------------------|
| instrumentationKey              | Application Insights Instrumentation Key                                                                   |
| endpointUrl                     | The ingestion endpoint to send telemetry payloads to                                                       |
| proxyHttpUrl                    | A proxy server for SDK HTTP traffic (Optional, Default pulled from `http_proxy` environment variable)      |
| proxyHttpsUrl                   | A proxy server for SDK HTTPS traffic (Optional, Default pulled from `https_proxy` environment variable)    |
| maxBatchSize                    | The maximum number of telemetry items to include in a payload to the ingestion endpoint (Default `250`)    |
| maxBatchIntervalMs              | The maximum amount of time to wait to for a payload to reach maxBatchSize (Default `15000`)                |
| disableAppInsights              | A flag indicating if telemetry transmission is disabled (Default `false`)                                  |
| samplingPercentage              | The percentage of telemetry items tracked that should be transmitted (Default `100`)                       |
| correlationIdRetryIntervalMs    | The time to wait before retrying to retrieve the id for cross-component correlation (Default `30000`)      |
| correlationHeaderExcludedDomains| A list of domains to exclude from cross-component correlation header injection (Default See [Config.ts][]) |
| ignoreLegacyHeaders             | Disable including legacy headers in outgoing requests, x-ms-request-id                                     |
| distributedTracingMode          | Sets the distributed tracing modes (Default=AI)                                                            |
| enableAutoCollectExternalLoggers| Sets the state of console. If true logger activity will be sent to Application Insights |
| enableAutoCollectConsole        | Sets the state of logger tracking (enabled by default for third-party loggers only). If true, logger auto collection will include console.log calls (default false) |
| enableAutoCollectExceptions     | Sets the state of exception tracking (enabled by default). If true uncaught exceptions will be sent to Application Insights |
| enableAutoCollectPerformance    | Sets the state of performance tracking (enabled by default). If true performance counters will be collected every second and sent to Application Insights |
| enableAutoCollectExtendedMetrics| Sets the state of performance tracking (enabled by default). If true, extended metrics counters will be collected every minute and sent to Application Insights |
| enableAutoCollectPreAggregatedMetrics | Sets the state of pre aggregated metrics tracking (enabled by default). If true pre aggregated metrics will be collected every minute and sent to Application Insights |
| enableAutoCollectHeartbeat      | Sets the state of request tracking (enabled by default). If true HeartBeat metric data will be collected every 15 minutes and sent to Application Insights |
| enableAutoCollectRequests      | Sets the state of request tracking (enabled by default). If true requests will be sent to Application Insights |
| enableAutoCollectDependencies  | Sets the state of dependency tracking (enabled by default). If true dependencies will be sent to Application Insights |
| enableAutoDependencyCorrelation| Sets the state of automatic dependency correlation (enabled by default). If true dependencies will be correlated with requests |
| enableUseAsyncHooks            | Sets the state of automatic dependency correlation (enabled by default). If true, forces use of experimental async_hooks module to provide correlation. If false, instead uses only patching-based techniques. If left blank, the best option is chosen for you based on your version of Node.js. |
| enableUseDiskRetryCaching     | If true events that occurred while client is offline will be cached on disk |
| enableResendInterval          | The wait interval for resending cached events. |
| enableMaxBytesOnDisk          | The maximum size (in bytes) that the created temporary directory for cache events can grow to, before caching is disabled. |
| enableInternalDebugLogging    | Enables debug and warning logging for AppInsights itself. If true, enables debug logging |
| enableInternalWarningLogging  | Enables debug and warning logging for AppInsights itself. If true, enables warning logging |
| enableSendLiveMetrics         | Enables communication with Application Insights Live Metrics. If true, enables communication with the live metrics service |
| disableAllExtendedMetrics     | Disable all environment variables set |
| extendedMetricDisablers       | Disable individual environment variables set. `"extendedMetricDisablers": "..."` |
| noDiagnosticChannel           | In order to track context across asynchronous calls, some changes are required in third party libraries such as mongodb and redis. By default ApplicationInsights will use diagnostic-channel-publishers to monkey-patch some of these libraries. This property is to disable the feature. Note that by setting this flag, events may no longer be correctly associated with the right operation.  |
| noPatchModules                | Disable individual monkey-patches. Set `noPatchModules` to a comma separated list of packages to disable. e.g. `"noPatchModules": "console,redis"` to avoid patching the console and redis packages. The following modules are available: `azuresdk, bunyan, console, mongodb, mongodb-core, mysql, redis, winston, pg`, and `pg-pool`. Visit the [diagnostic-channel-publishers' README](https://github.com/microsoft/node-diagnostic-channel/blob/master/src/diagnostic-channel-publishers/README.md) for information about exactly which versions of these packages are patched. |
| noHttpAgentKeepAlive          | HTTPS without a passed in agent |
| httpAgent                       | An http.Agent to use for SDK HTTP traffic (Optional, Default undefined)                                    |
| httpsAgent                      | An https.Agent to use for SDK HTTPS traffic (Optional, Default undefined)
| aadTokenCredential| Azure Credential instance to be used to authenticate the App. [AAD Identity Credential Classes](https://github.com/Azure/azure-sdk-for-js/tree/master/sdk/identity/identity#credential-classes)
| enableAutoWebSnippetInjection(Preview)| Sets the state of automatic web snippet injection (Optional, disabled by default). If true, web snippet will be injected into valid node server http response automatically with the connection string used for SDK initialization
| webSnippetConnectionString(Preview)| Sets connection string used for web snippet injection (Optional, Default undefined)|                            |

[Config.ts]: https://github.com/microsoft/ApplicationInsights-node.js/blob/develop/Library/Config.ts 

All these properties except httpAgent, httpsAgent and aadTokenCredential could be configured using configuration file `applicationinsights.json` located under root folder of applicationinsights package installation folder, Ex: `node_modules/applicationinsights`. These configuration values will be applied to all TelemetryClients created in the SDK. 


```javascript
{
    "samplingPercentage": 80,
    "enableAutoCollectExternalLoggers": true,
    "enableAutoCollectExceptions": true,
    "enableAutoCollectHeartbeat": true,
    "enableSendLiveMetrics": true,
    ...
}
  
```

Custom JSON file could be provided using `APPLICATIONINSIGHTS_CONFIGURATION_FILE` environment variable.

```javascript
process.env.APPLICATIONINSIGHTS_CONFIGURATION_FILE = "C:/applicationinsights/config/customConfig.json"

// Application Insights SDK setup....
```

### Sampling

By default, the SDK will send all collected data to the Application Insights service. If you collect a lot of data, you might want to enable sampling to reduce the amount of data sent. Set the `samplingPercentage` field on the Config object of a Client to accomplish this. Setting `samplingPercentage` to 100 (the default) means all data will be sent, and 0 means nothing will be sent.

If you are using automatic correlation, all data associated with a single request will be included or excluded as a unit.

Add code such as the following to enable sampling:

```javascript
const appInsights = require("applicationinsights");
appInsights.setup("<YOUR_CONNECTION_STRING>");
appInsights.defaultClient.config.samplingPercentage = 33; // 33% of all telemetry will be sent to Application Insights
appInsights.start();
```

### Multiple roles for multi-component applications

If your application consists of multiple components that you wish to instrument all with the same Instrumentation Key and still see these components as separate units in the Portal as if they were using separate Instrumentation Keys (for example, as separate nodes on the Application Map) you may need to manually configure the RoleName field to distinguish one component's telemetry from other components sending data to your Application Insights resource. (See [Monitor multi-component applications with Application Insights (preview)](https://docs.microsoft.com/azure/application-insights/app-insights-monitor-multi-role-apps))

Use the following to set the RoleName field:

```javascript
const appInsights = require("applicationinsights");
appInsights.setup("<YOUR_CONNECTION_STRING>");
appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = "MyRoleName";
appInsights.start();
```

If running in Azure App service or Azure functions the SDK will automatically populate the cloud role when following code is added:
```javascript
const appInsights = require("applicationinsights");
appInsights.setup("<YOUR_CONNECTION_STRING>");
appInsights.defaultClient.setAutoPopulateAzureProperties(true);
appInsights.start();
```

### Automatic web snippet injection[Preview]

 Automatic web snippet injection is currently in **Preview**. For node server with configuration `enableAutoWebSnippetInjection` set to `true` or environment variable `APPLICATIONINSIGHTS_WEB_SNIPPET_ENABLED = true`, web snippet will be injected into node server response when all of the following requirements are met:

- Response has status code `200`.
- Response method is `GET`.
- Sever response has `Content-Type` html.
- Server response must have both `<head>` and `</head>` Tags.
- If response is compressed, it must have only one `Content-Encoding` type, and encoding type must be one of `gzip`, `br` or `deflate`.
- Response does not contain current /backup snippet CDN endpoints.  (current and backup snippet CDN endpoints [here](https://github.com/microsoft/ApplicationInsights-JS#active-public-cdn-endpoints))

**Note:** Snippet auto injection may slow down server response time, especially when response size is large or response is compressed. For the case in which some middle layers are applied, it may result in auto injection not working and original response will be returned.

### Automatic third-party instrumentation

In order to track context across asynchronous calls, some changes are required in third party libraries such as mongodb and redis.
By default ApplicationInsights will use [`diagnostic-channel-publishers`](https://github.com/microsoft/node-diagnostic-channel/tree/master/src/diagnostic-channel-publishers)
to monkey-patch some of these libraries.
This can be disabled by setting the `APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL` environment variable. Note that by setting that
environment variable, events may no longer be correctly associated with the right operation. Individual monkey-patches can be
disabled by setting the `APPLICATION_INSIGHTS_NO_PATCH_MODULES` environment variable to a comma separated list of packages to
disable, e.g. `APPLICATION_INSIGHTS_NO_PATCH_MODULES=console,redis` to avoid patching the `console` and `redis` packages.

The following modules are available: `azuresdk`, `bunyan`, `console`, `mongodb`, `mongodb-core`, `mysql`, `redis`, `winston`,
`pg`, and `pg-pool`. Visit the [diagnostic-channel-publishers' README](https://github.com/microsoft/node-diagnostic-channel/blob/master/src/diagnostic-channel-publishers/README.md)
for information about exactly which versions of these packages are patched.

Automatic instrumentation for several Azure SDKs is also enabled, currently Cognitive Search, Communication Common and Cosmos DB SDKs are not supported.
[Javascript Azure SDKs](https://azure.github.io/azure-sdk/releases/latest/index.html#javascript)

The `bunyan`, `winston`, and `console` patches will generate Application Insights Trace events based on whether `setAutoCollectConsole` is enabled.
The rest will generate Application Insights Dependency events based on whether `setAutoCollectDependencies` is enabled. Make sure that `applicationinsights` is imported **before** any 3rd-party packages for them to be instrumented successfully.


### Live Metrics
To enable sending live metrics of your app to Azure, use `setSendLiveMetrics(true)`. Filtering of live metrics in the Portal is currently not supported.

### Extended Metrics
>***Note:*** The ability to send extended native metrics was added in version `1.4.0`

To enable sending extended native metrics of your app to Azure, simply install the separate native metrics package. The SDK will automatically load it when it is installed and start collecting Node.js native metrics.
```zsh
npm install applicationinsights-native-metrics
```
Currently, the native metrics package performs autocollection of Garbage Collection CPU time, Event Loop ticks, and heap usage:
- **Garbage Collection:** The amount of CPU time spent on each type of garbage collection, and how many occurrences of each type.
- **Event Loop:** How many ticks occurred and how much CPU time was spent in total.
- **Heap vs Non-Heap:** How much of your app's memory usage is in the heap or non-heap.

### Distributed Tracing Modes
By default, this SDK will send headers understood by other applications/services instrumented with an Application Insights SDK. You can optionally enable sending/receiving of [W3C Trace Context](https://github.com/w3c/trace-context) headers in addition to the existing AI headers, so you will not break correlation with any of your existing legacy services. Enabling W3C headers will allow your app to correlate with other services not instrumented with Application Insights, but do adopt this W3C standard.

```js
const appInsights = require("applicationinsights");
appInsights
  .setup("<YOUR_CONNECTION_STRING>")
  .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
  .start()
```

## Track custom telemetry

You can track any request, event, metric or exception using the Application
Insights client. Examples follow:

```javascript
let appInsights = require("applicationinsights");
appInsights.setup().start(); // assuming connection string is in environment variables. start() can be omitted to disable any non-custom data
let client = appInsights.defaultClient;
client.trackEvent({name: "my custom event", properties: {customProperty: "custom property value"}});
client.trackException({exception: new Error("handled exceptions can be logged with this method")});
client.trackMetric({name: "custom metric", value: 3});
client.trackTrace({message: "trace message"});
client.trackDependency({target:"http://dbname", name:"select customers proc", data:"SELECT * FROM Customers", duration:231, resultCode:0, success: true, dependencyTypeName: "ZSQL"});
client.trackRequest({name:"GET /customers", url:"http://myserver/customers", duration:309, resultCode:200, success:true});
 
let http = require("http");
http.createServer( (req, res) => {
  client.trackNodeHttpRequest({request: req, response: res}); // Place at the beginning of your request handler
});
```

Note that custom properties are converted to their string representation before being sent, see [Using properties](https://docs.microsoft.com/azure/azure-monitor/app/api-custom-events-metrics#properties) for more information.

An example utility using `trackMetric` to measure how long event loop scheduling takes:

```javascript
function startMeasuringEventLoop() {
  var startTime = process.hrtime();
  var sampleSum = 0;
  var sampleCount = 0;

  // Measure event loop scheduling delay
  setInterval(() => {
    var elapsed = process.hrtime(startTime);
    startTime = process.hrtime();
    sampleSum += elapsed[0] * 1e9 + elapsed[1];
    sampleCount++;
  }, 0);

  // Report custom metric every second
  setInterval(() => {
    var samples = sampleSum;
    var count = sampleCount;
    sampleSum = 0;
    sampleCount = 0;

    if (count > 0) {
      var avgNs = samples / count;
      var avgMs = Math.round(avgNs / 1e6);
      client.trackMetric({name: "Event Loop Delay", value: avgMs});
    }
  }, 1000);
}
```

## Preprocess data with Telemetry Processors

```javascript
public addTelemetryProcessor(telemetryProcessor: (envelope: Contracts.Envelope, context: { http.RequestOptions, http.ClientRequest, http.ClientResponse, Error, correlationContext }) => boolean)
```

You can process and filter collected data before it is sent for retention using
_Telemetry Processors_. Telemetry processors are called one by one in the
order they were added before the telemetry item is sent to the cloud.

If a telemetry processor returns false that telemetry item will not be sent.

All telemetry processors receive the telemetry data and its envelope to inspect and
modify. They also receive a context object. The contents of this object is defined by
the `contextObjects` parameter when calling a track method for manually tracked telemetry.
For automatically collected telemetry, this object is filled with available request information
and the persistent request context as provided by `appInsights.getCorrelationContext()` (if
automatic dependency correlation is enabled).

The TypeScript type for a telemetry processor is:

```typescript
telemetryProcessor: (envelope: ContractsModule.Contracts.Envelope, context: { http.RequestOptions, http.ClientRequest, http.ClientResponse, Error, correlationContext }) => boolean;
```

For example, a processor that removes stack trace data from exceptions might be
written and added as follows:

```javascript
function removeStackTraces ( envelope, context ) {
  if (envelope.data.baseType === "ExceptionData") {
    var data = envelope.data.baseData;
    if (data.exceptions && data.exceptions.length > 0) {
      for (var i = 0; i < data.exceptions.length; i++) {
        var exception = data.exceptions[i];
        exception.parsedStack = null;
        exception.hasFullStack = false;
      }
    }
    // Add extra properties
    var originalError = context["Error"];
    if(originalError && originalError.prop){
      data.properties = data.properties || {};
      data.properties.customProperty = originalError.prop;
    }
  }
  return true;
}

appInsights.defaultClient.addTelemetryProcessor(removeStackTraces);
```

More info on the telemetry API is available in [the docs][].

[the docs]: https://azure.microsoft.com/documentation/articles/app-insights-api-custom-events-metrics/

## Use multiple Application Insights resources

You can create multiple Azure Application Insights resources and send different
data to each by using their respective connection string. For
example:

```javascript
let appInsights = require("applicationinsights");

// configure auto-collection under one Connection String
appInsights.setup("<YOUR_CONNECTION_STRING>").start();

// track some events manually under another connection string
let otherClient = new appInsights.TelemetryClient("<YOUR_CONNECTION_STRING>");
otherClient.trackEvent({name: "my custom event"});
```

## Examples

* Track dependencies

    ```javascript
    let appInsights = require("applicationinsights");
    let client = new appInsights.TelemetryClient();

    var success = false;
    let startTime = Date.now();
    // execute dependency call here....
    let duration = Date.now() - startTime;
    success = true;

    client.trackDependency({target:"http://dbname", name:"select customers proc", data:"SELECT * FROM Customers", duration:duration, resultCode:0, success: true, dependencyTypeName: "ZSQL"});
    ```

* Assign custom properties to be included with all events

    ```javascript
    appInsights.defaultClient.commonProperties = {
      environment: process.env.SOME_ENV_VARIABLE
    };
    ```

* Manually track all HTTP GET requests

    Note that all requests are tracked by default. To disable automatic
    collection, call `.setAutoCollectRequests(false)` before calling `start()`.

    ```javascript
    appInsights.defaultClient.trackRequest({name:"GET /customers", url:"http://myserver/customers", duration:309, resultCode:200, success:true});
    ```
    Alternatively you can track requests using ```trackNodeHttpRequest``` method:

    ```javascript
    var server = http.createServer((req, res) => {
      if ( req.method === "GET" ) {
          appInsights.defaultClient.trackNodeHttpRequest({request:req, response:res});
      }
      // other work here....
      res.end();
    });
    ```

* Track server startup time

    ```javascript
    let start = Date.now();
    server.on("listening", () => {
      let duration = Date.now() - start;
      appInsights.defaultClient.trackMetric({name: "server startup time", value: duration});
    });
    ```

## Self-diagnostics

"Self-diagnostics" refers to internal logging from Application Insights Node.js SDK.

This functionality can be helpful for spotting and diagnosing issues with Application Insights itself.

By default, Application Insights Node.js SDK logs at warning level to console, following code demonstrate how to enable debug logging as well and generate telemetry for internal logs:

```javascript
let appInsights = require("applicationinsights");
appInsights.setup("<YOUR_CONNECTION_STRING>")
    .setInternalLogging(true, true) // Enable both debug and warning logging
    .setAutoCollectConsole(true, true) // Generate Trace telemetry for winston/bunyan and console logs
    .start();
```

Logs could be put into local file using `APPLICATIONINSIGHTS_LOG_DESTINATION` environment variable, supported values are `file` and `file+console`, a file named `applicationinsights.log` will be generated on tmp folder by default, including all logs,  `/tmp` for *nix and `USERDIR/AppData/Local/Temp` for Windows. Log directory could be configured using `APPLICATIONINSIGHTS_LOGDIR` environment variable.

```javascript
process.env.APPLICATIONINSIGHTS_LOG_DESTINATION = "file";
process.env.APPLICATIONINSIGHTS_LOGDIR = "C:/applicationinsights/logs"

// Application Insights SDK setup....
```

## Branches

- Ongoing development takes place on the [develop][] branch. **Please submit
  pull requests to this branch.**
- Releases are merged to the [master][] branch and published to [npm][].

[master]: https://github.com/microsoft/ApplicationInsights-node.js/tree/master
[develop]: https://github.com/microsoft/ApplicationInsights-node.js/tree/develop
[npm]: https://www.npmjs.com/package/applicationinsights

## Contributing

This project welcomes contributions and suggestions. Most contributions require you to
agree to a Contributor License Agreement (CLA) declaring that you have the right to,
and actually do, grant us the rights to use your contribution. For details, visit
https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need
to provide a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the
instructions provided by the bot. You will only need to do this once across all repositories using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/)
or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Data Collection

As this SDK is designed to enable applications to perform data collection which is sent to the Microsoft collection endpoints the following is required to identify our privacy statement.

The software may collect information about you and your use of the software and send it to Microsoft. Microsoft may use this information to provide services and improve our products and services. You may turn off the telemetry as described in the repository. There are also some features in the software that may enable you and Microsoft to collect data from users of your applications. If you use these features, you must comply with applicable law, including providing appropriate notices to users of your applications together with a copy of Microsoft’s privacy statement. Our privacy statement is located at https://go.microsoft.com/fwlink/?LinkID=824704. You can learn more about data collection and use in the help documentation and our privacy statement. Your use of the software operates as your consent to these practices.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft trademarks or logos is subject to and must follow [Microsoft’s Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general). Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship. Any use of third-party trademarks or logos are subject to those third-party’s policies.

## License

[MIT](LICENSE)