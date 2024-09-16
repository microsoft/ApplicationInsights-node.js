# Application Insights for Node.js

[![npm version](https://badge.fury.io/js/applicationinsights.svg)](http://badge.fury.io/js/applicationinsights)

Application Insights SDK monitors your backend services and components after
you deploy them to help you discover and rapidly diagnose performance and other
issues. Add this SDK to your Node.js services to include deep info about Node.js
processes and their external dependencies such as database and cache services.
You can use this SDK for your Node.js services hosted anywhere: your datacenter,
Azure VMs and Web Apps, and even other public clouds. This solution is based on OpenTelemetry, to learn more about OpenTelemetry concepts, see the [OpenTelemetry overview](opentelemetry-overview.md) or [OpenTelemetry FAQ](/azure/azure-monitor/faq#opentelemetry).

[Azure Application Insights]: https://azure.microsoft.com/documentation/articles/app-insights-overview/
[discover and rapidly diagnose performance and other issues]: https://docs.microsoft.com/azure/application-insights/app-insights-detect-triage-diagnose

## Supported Node.js versions

> *Important:* The Azure Monitor OpenTelemetry-based Offerings for Node.js applications do not support older versions of Node that were supported by
Application Insights 2.X SDK. If you rely on this support, please continue to use version 2.X.

We support the versions of Node.js that are [supported by OpenTelemetry](https://github.com/open-telemetry/opentelemetry-js#supported-runtimes).

## Limitations of Application Insights 3.X SDK

Consider whether this version is right for you. It *enables distributed tracing, metrics, logs* and _excludes_:

 - Autopopulation of Cloud Role Name and Cloud Role Instance in Azure environments
 - Autopopulation of User ID and Authenticated User ID when you use the Application Insights JavaScript SDK
 - Autopopulation of User IP (to determine location attributes)
 - Ability to override Operation Name
 - Ability to manually set User ID or Authenticated User ID
 - Propagating Operation Name to Dependency Telemetry

> *Warning:* This SDK only works for Node.js environments. Use the [Application Insights JavaScript SDK](https://github.com/microsoft/ApplicationInsights-JS) for web and browser scenarios.

To determine if this version of Application Insights is right for you, review the [Application Insights 2.X SDK migration guide](https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-nodejs-migrate?tabs=cleaninstall).

### Prerequisites

- Azure subscription: [Create an Azure subscription for free](https://azure.microsoft.com/free/)
- Application Insights resource: [Create an Application Insights resource](create-workspace-resource.md#create-a-workspace-based-resource)

- Application using an officially [supported version](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/monitor/monitor-opentelemetry-exporter#currently-supported-environments) of Node.js runtime:
  - [OpenTelemetry supported runtimes](https://github.com/open-telemetry/opentelemetry-js#supported-runtimes)
  - [Azure Monitor OpenTelemetry Exporter supported runtimes](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/monitor/monitor-opentelemetry-exporter#currently-supported-environments)

## Get started
> *Important:* On March 31st, 2025, support for instrumentation key ingestion will end. Instrumentation key ingestion will continue to work, but we’ll no longer provide updates or support for the feature. [Transition to connection strings](https://docs.microsoft.com/azure/azure-monitor/app/migrate-from-instrumentation-keys-to-connection-strings) to take advantage of [new capabilities](https://docs.microsoft.com/en-us/azure/azure-monitor/app/migrate-from-instrumentation-keys-to-connection-strings#new-capabilities).

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

* If the connection string is set in the environment variable
  APPLICATIONINSIGHTS\_CONNECTION\_STRING, `.setup()` can be called with no
  arguments. This makes it easy to use different connection strings for different
  environments.

Load the Application Insights library (i.e. `require("applicationinsights")`) as
early as possible in your scripts, before loading other packages. This is needed
so that the Application Insights library can prepare later packages for tracking.
If you encounter conflicts with other libraries doing similar preparation, try
loading the Application Insights library after those.


## Configuration

The appInsights object provides a number of methods to setup SDK behavior. They are
listed in the following snippet with their default values.

```javascript
let appInsights = require("applicationinsights");
appInsights.setup("<YOUR_CONNECTION_STRING>")
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true, false)
    .setAutoCollectPreAggregatedMetrics(true)
    .setSendLiveMetrics(false)
    .setInternalLogging(false, true)
    .enableWebInstrumentation(false)
    .start();
```

Please review their descriptions in your IDE's built-in type hinting, or [applicationinsights.ts](https://github.com/microsoft/ApplicationInsights-node.js/tree/main/src/shim/applicationinsights.ts) for
detailed information on what these control, and optional secondary arguments.

Note that by default `setAutoCollectConsole` is configured to *exclude* calls to `console.log`
(and other `console` methods). By default, only calls to supported third-party loggers
(e.g. `winston`, `bunyan`) will be collected. You can change this behavior to *include* calls
to `console` methods by using `setAutoCollectConsole(true, true)`.

Note that by default `enableWebInstrumentation` will use the connection string for SDK initialization. If you want to use a different one, you can set it as `enableWebInstrumentation(true, "your-connection-string")`.

The TelemetryClient object contains a `config` property with many optional settings. These can be set as follows:
```
client.config.PROPERTYNAME = VALUE;
```
These properties are client specific, so you can configure `appInsights.defaultClient`
separately from clients created with `new appInsights.TelemetryClient()`.

| Property                        | Description                                                                                                |
| ------------------------------- |------------------------------------------------------------------------------------------------------------|
| proxyHttpUrl                    | A proxy server for SDK HTTP traffic (Optional, Default pulled from `http_proxy` environment variable)      |
| proxyHttpsUrl                   | A proxy server for SDK HTTPS traffic (Optional, Default pulled from `https_proxy` environment variable)    |
| maxBatchIntervalMs              | The maximum amount of time to wait to for a payload to reach maxBatchSize (Default `15000`)                |
| samplingPercentage              | The percentage of telemetry items tracked that should be transmitted (Default `100`)                       |
| enableAutoCollectExternalLoggers| Sets the state of console. If true logger activity will be sent to Application Insights |
| enableAutoCollectConsole        | Sets the state of logger tracking (enabled by default for third-party loggers only). If true, logger auto collection will include console.log calls (default false) |
| enableAutoCollectExceptions     | Sets the state of exception tracking (enabled by default). If true uncaught exceptions will be sent to Application Insights |
| enableAutoCollectPerformance    | Sets the state of performance tracking (enabled by default). If true performance counters will be collected every second and sent to Application Insights |
| enableAutoCollectPreAggregatedMetrics | Sets the state of pre aggregated metrics tracking (enabled by default). If true pre aggregated metrics will be collected every minute and sent to Application Insights |
| enableAutoCollectRequests      | Sets the state of request tracking (enabled by default). If true requests will be sent to Application Insights |
| enableAutoCollectDependencies  | Sets the state of dependency tracking (enabled by default). If true dependencies will be sent to Application Insights |
| enableUseDiskRetryCaching     | If true events that occurred while client is offline will be cached on disk |
| enableInternalDebugLogging    | Enables debug and warning logging for AppInsights itself. If true, enables debug logging |
| enableInternalWarningLogging  | Enables debug and warning logging for AppInsights itself. If true, enables warning logging |
| enableSendLiveMetrics         | Enables communication with Application Insights Live Metrics. If true, enables communication with the live metrics service |
| noDiagnosticChannel           | In order to track context across asynchronous calls, some changes are required in third party libraries such as mongodb and redis. By default ApplicationInsights will use diagnostic-channel-publishers to monkey-patch some of these libraries. This property is to disable the feature. Note that by setting this flag, events may no longer be correctly associated with the right operation.  |
| noPatchModules                | Disable individual monkey-patches. Set `noPatchModules` to a comma separated list of packages to disable. e.g. `"noPatchModules": "console,redis"` to avoid patching the console and redis packages. The following modules are available: `azuresdk, bunyan, console, mongodb, mongodb-core, mysql, redis, winston, pg`, and `pg-pool`. Visit the [diagnostic-channel-publishers' README](https://github.com/microsoft/node-diagnostic-channel/blob/master/src/diagnostic-channel-publishers/README.md) for information about exactly which versions of these packages are patched. |
| aadTokenCredential| Azure Credential instance to be used to authenticate the App. [AAD Identity Credential Classes](https://github.com/Azure/azure-sdk-for-js/tree/master/sdk/identity/identity#credential-classes)
| enableWebInstrumentation | Sets the state of automatic web Instrumentation (Optional, disabled by default). If true, web instrumentation will be enabled on valid node server http response with the connection string used for SDK initialization
| webInstrumentationConnectionString | Sets connection string used for web Instrumentation (Optional, Default undefined)|
| webInstrumentationSrc | Sets web Instrumentation CDN url (Optional). see more details at [ApplicationInsights JavaScript SDK](https://github.com/microsoft/ApplicationInsights-JS)|

[Config.ts]: https://github.com/microsoft/ApplicationInsights-node.js/blob/main/src/shim/shim-config.ts

All these properties except aadTokenCredential could be configured using configuration file `applicationinsights.json` located under root folder of applicationinsights package installation folder, Ex: `node_modules/applicationinsights`. These configuration values will be applied to all TelemetryClients created in the SDK. 


```javascript
{
    "samplingPercentage": 80,
    "enableAutoCollectExternalLoggers": true,
    "enableAutoCollectExceptions": true,
    "enableSendLiveMetrics": true,
    ...
}
  
```

Custom JSON file could be provided using `APPLICATIONINSIGHTS_CONFIGURATION_FILE` environment variable.

```javascript
process.env.APPLICATIONINSIGHTS_CONFIGURATION_FILE = "C:/applicationinsights/config/customConfig.json"

// Application Insights SDK setup....
```

Alternatively, instead of using a configuration file, you can specify the entire content of the JSON configuration via the environment variable `APPLICATIONINSIGHTS_CONFIGURATION_CONTENT`.

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

### Automatic web Instrumentation

  For node server with configuration `enableWebInstrumentation` set to `true` or environment variable `APPLICATIONINSIGHTS_WEB_INSTRUMENTATION_ENABLED = true`, web Instrumentation will be enabled on node server response when all of the following requirements are met:

- Response has status code `200`.
- Response method is `GET`.
- Sever response has `Content-Type` html.
- Server response must have both `<head>` and `</head>` Tags.
- If response is compressed, it must have only one `Content-Encoding` type, and encoding type must be one of `gzip`, `br` or `deflate`.
- Response does not contain current /backup web Instrumentation CDN endpoints.  (current and backup Web Instrumentation CDN endpoints [here](https://github.com/microsoft/ApplicationInsights-JS#active-public-cdn-endpoints))

web Instrumentation CDN endpoint can be changed by setting environment variable `APPLICATIONINSIGHTS_WEB_INSTRUMENTATION_SOURCE = "web Instrumentation CDN endpoints"`.
web Instrumentation connection string can be changed by setting environment variable `APPLICATIONINSIGHTS_WEB_INSTRUMENTATION_CONNECTION_STRING = "web Instrumentation connection string"`

**Note:** web Instrumentation may slow down server response time, especially when response size is large or response is compressed. For the case in which some middle layers are applied, it may result in web Instrumentation not working and original response will be returned.

### Automatic third-party instrumentation

> If you require further third-party instrumenatations please use the [Azure Monitor OpenTelemetry Distro](https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-enable?tabs=nodejs) to take advantage of OpenTelemetry. If you are an Application Insights 2.X SDK user,
a [migration guide](https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-nodejs-migrate?tabs=upgrade) is available.

In order to track context across asynchronous calls, some changes are required in third party libraries such as mongodb and redis.
By default ApplicationInsights will use the appropriate OpenTelemetry instrumentation for each library.
This can be disabled by setting the `APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL` environment variable. Note that by setting that
environment variable, events may no longer be correctly associated with the right operation. Individual instrumentations can be
disabled by setting the `APPLICATION_INSIGHTS_NO_PATCH_MODULES` environment variable to a comma separated list of packages to
disable, e.g. `APPLICATION_INSIGHTS_NO_PATCH_MODULES=console,redis` to avoid patching the `console` and `redis` packages.

The following modules are available: `azuresdk`, `bunyan`, `console`, `mongodb`, `mongodb-core`, `mysql`, `redis`, `winston`,
`pg`, and `pg-pool`. 

Automatic instrumentation for several Azure SDKs is also enabled.
[Javascript Azure SDKs](https://azure.github.io/azure-sdk/releases/latest/index.html#javascript)

The `bunyan`, `winston`, and `console` patches will generate Application Insights Trace events based on whether `setAutoCollectConsole` is enabled.
The rest will generate Application Insights Dependency events based on whether `setAutoCollectDependencies` is enabled. Make sure that `applicationinsights` is imported **before** any 3rd-party packages for them to be instrumented successfully.

### Live Metrics
To enable sending live metrics of your app to Azure, use `setSendLiveMetrics(true)`. Filtering of live metrics in the Portal is currently not supported.

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
client.trackAvailability({id: "123456789abcdefghijklmnopqrstuvw", name: "availalaibility-test-name", duration: 1000, success: true, runLocation: "Japan East", message: "Passed"})

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

Debug Logs could be enabled as well using APPLICATION_INSIGHTS_ENABLE_DEBUG_LOGS environment variable, and APPLICATION_INSIGHTS_DISABLE_WARNING_LOGS environment variable to disable warnings. Logs could be put into local file using `APPLICATIONINSIGHTS_LOG_DESTINATION` environment variable, supported values are `file` and `file+console`, a file named `applicationinsights.log` will be generated on tmp folder by default, including all logs,  `/tmp` for *nix and `USERDIR/AppData/Local/Temp` for Windows. Log directory could be configured using `APPLICATIONINSIGHTS_LOGDIR` environment variable.

```javascript
process.env.APPLICATIONINSIGHTS_LOG_DESTINATION = "file";
process.env.APPLICATIONINSIGHTS_LOGDIR = "C:/applicationinsights/logs"

// Application Insights SDK setup....
```

## ApplicationInsights 3.X SDK Unsupported Properties

Application Insights 3.X SDK will provide support path for customers who only require basic instrumentation as opposed to migrating to Azure Monitor OpenTelemetry. If unsupported methods are called, they are not breaking and your application will still run. Calling these unsupported methods will throw a warning that the method is not supported.

The following methods are called after using the below method.

```javascript
let applicationinsights = require("applicationinsights");
appinsights.setup("<YOUR_CONNECTION_STRING>").start();
```

And invoked via `appInsights.<METHOD_NAME>`
|Property                     |Support Status                                                                                              |
| ----------------------------|------------------------------------------------------------------------------------------------------------|
| setDistributedTracingMode   | AI only tracing mode is no longer supported. Migrate to using W3C_AND_AI tracing mode. |
| setAutoCollectHeartbeat     | Heartbeat is not supported in either Azure Monitor OpenTelemetry or the Application Insights 3.X SDK.|
| setAutoDependencyCorrelation| Turning off autoDependencyCorrelation is not supported by either Azure Monitor OpenTelemetry or the Application Insights 3.X SDK. |
| setUseDiskRetryCaching      | While enabling/disabling offline storage is supported, setting the resend interval or the maxBytesOnDisk values are not supported in the Application Insights 3.X SDK or Azure Monitor OpenTelemetry. |
| setAutoCollectIncomingRequestAzureFunctions | Auto collection of Azure Functions is not supported by the Application Insights 3.X SDK or Azure Monitor OpenTelemetry. |

The following configurations are set using either environment variables, setting them in the `applicationinsights.json` file or by calling `appInsights.defaultClient.config.<CONFIG_SETTING_VALUE>;`.

|Property               |Support Status                                                         |
|-----------------------|-----------------------------------------------------------------------|
| instrumentationKey & endpointUrl | Not supported by the Application Insights 3.X SDK or Azure Monitor OpenTelemetry. Please migrate to using the connectionString. |
| maxBatchSize | Not supported by the Application Insights 3.X SDK but can be configured by using OpenTelemetry SpanProcessors in Azure Monitor OpenTelemetry. |
| disableAppInsights | Not supported by the Application Insights 3.X SDK. Disabling telemetry export is possible via Azure Monitor OpenTelemetry using OpenTelemetry.|
| correlationIdRetryIntervalMs | Not supported by either the Application Insights 3.X SDK or Azure Monitor OpenTelemetry as correlation ID is deprecated.|
| ignoreLegacyHeaders | Legacy headers in outgoing requests are not supported in the Application Insights 3.X SDK or Azure Monitor OpenTelemetry. Therefore they will always be disabled. |
| distributedTracingMode | Distributed tracing mode is always set to AI_AND_W3C. AI only tracing mode is not supported in the Application Insights 3.X SDK or Azure Monitor OpenTelemetry.|
| enableLoggerErrorToTrace | Not supported in the Application Insights 3.X SDK or Azure Monitor OpenTelemetry as all errors will be logged as exceptions in both. |
| enableAutoCollectHeartbeat | Heartbeat is not supported in the Application Insights 3.X SDK or Azure Monitor OpenTelemetry as it is deprecated. |
| enableAutoDependencyCorrelation | Cannot disable dependency correlation in either the Application Insights 3.X SDK or Azure Monitor OpenTelemetry. Dependency correlation will always be enabled and therefore this setting is always true. |
| enableAutoCollectIncomingRequestAzureFunctions | Auto collection of Azure Functions is not supported by the Application Insights 3.X SDK or Azure Monitor OpenTelemetry. |
| enableUseAsyncHooks | Using async hooks is not supported by the Application Insights 3.X SDK or Azure Monitor OpenTelemetry as it is not supported by OpenTelemetry. |
| enableResendInterval | Not supported by the Application Insights 3.X SDK. It is possible to configure the interval between exports via OpenTelemetry span processors, but not specifically cached events. The @azure/monitor-opentelemetry-exporter uses a resend interval of one minute. |
| enableMaxBytesOnDisk | Not supported by the Application Insights 3.X SDK. And not supported to be changed in Azure Monitor OpenTelemetry. The @azure/monitor-opentelemetry-exporter sets this value at 50MB. |
| noHttpAgentKeepAlive | Not supported in the Application Insights 3.X SDK or Azure Monitor OpenTelemetry. |
| httpAgent/httpsAgent | Not supported in the Application Insights 3.X SDK or Azure Monitor OpenTelemetry. |
| webInstrumentationConfig | Not currently supported by the Application Insights 3.X SDK or Azure Monitor OpenTelemetry. |
| quickPulseHost | Not supported in the Application Insights 3.X SDK or Azure Monitor OpenTelemetry. |
| enableAutoCollectExtendedMetrics | Extended/native metrics are not supported in the Application Insights 3.X SDK or Azure Monitor OpenTelemetry. |
| disableAllExtendedMetrics | Will not have any effect as extended/native metrics are not supported in the Application Insights 3.X SDK or Azure Monitor OpenTelemetry. |
| extendedMetricDisablers | Will not have any effect as extended/native metrics are not supported in the Application Insights 3.X SDK or Azure Monitor OpenTelemetry. |
| correlationHeaderExcludedDomains | Not supported in the Application Insights 3.X SDK or Azure Monitor OpenTelemetry. |

The following methods are part of the `TelemetryClient` class. They can be called using `applicationinsights.defaultClient.<METHOD_NAME>()`.

|Property       |                     Support Status              |
|---------------|-------------------------------------------------|
| trackPageView | PageViewTelemetry requires an id and a name field now instead of only an optional name field. |
| track | Tracking generic telemetry is not longer supported. Please use one of the other manual track methods to track a specific telemetry type. | 
| getAuthorizationHandler | Not supported in the Application Insights 3.X SDK. |
| addTelemetryProcessor | TelemetryProcessors are not supported in the Application Insights 3.X SDK. Please migrate to Azure Monitor OpenTelemetry and use OpenTelemetry Span Processors. |
| clearTelemetryProcessors | TelemetryProcessors are not supported in the Application Insights 3.X SDK. Please migrate to Azure Monitor OpenTelemetry and use OpenTelemetry Span Processors. | 
| runTelemetryProcessors | TelemetryProcessors are not supported in the Application Insights 3.X SDK. Please migrate to Azure Monitor OpenTelemetry and use OpenTelemetry Span Processors. |
| trackNodeHttpRequestSync | Not supported. Please use the trackRequest method instead. |
| trackNodeHttpRequest | Not supported. Please use the trackRequest method instead. |
| trackNodeHttpDependency | Not supported. Please use the trackDependency method instead. |

`APPLICATIONINSIGHTS_INSTRUMENTATION_LOGGING_LEVEL` environment varialbe could be used to set desired log level, supporting the following values: `NONE`, `ERROR`, `WARN`, `INFO`, `DEBUG`, `VERBOSE` and  `ALL`.


Logs could be put into local file using `APPLICATIONINSIGHTS_LOG_DESTINATION` environment variable, supported values are `file` and `file+console`, a file named `applicationinsights.log` will be generated on tmp folder by default, including all logs,  `/tmp` for *nix and `USERDIR/AppData/Local/Temp` for Windows. Log directory could be configured using `APPLICATIONINSIGHTS_LOGDIR` environment variable.

```javascript
process.env.APPLICATIONINSIGHTS_INSTRUMENTATION_LOGGING_LEVEL = "VERBOSE";
process.env.APPLICATIONINSIGHTS_LOG_DESTINATION = "file";
process.env.APPLICATIONINSIGHTS_LOGDIR = "C:/applicationinsights/logs";

// Application Insights SDK setup....
```

## Support

For help and questions about using this project, please create a Support request issue on
https://github.com/microsoft/ApplicationInsights-node.js/issues.

For OpenTelemetry issues, contact the [OpenTelemetry JavaScript community](https://github.com/open-telemetry/opentelemetry-js) directly. [Support Policy](SUPPORT)


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

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft trademarks or logos is subject to and must follow [Microsoft’s Trademark & Brand Guidelines](https://www.microsoft.com/legal/intellectualproperty/trademarks/usage/general). Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship. Any use of third-party trademarks or logos are subject to those third-party’s policies.

## License

[MIT](LICENSE)
