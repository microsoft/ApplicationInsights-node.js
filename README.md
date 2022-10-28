# Azure Monitor Application Insights for Node.js



[Azure Monitor Application Insights][] monitors your backend services and components after
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


## Limitations of the preview release

Consider whether this preview is right for you. It *enables distributed tracing, metrics* and _excludes_:

 - Live Metrics
 - Autopopulation of Cloud Role Name and Cloud Role Instance in Azure environments
 - Autopopulation of User ID and Authenticated User ID when you use the Application Insights JavaScript SDK
 - Autopopulation of User IP (to determine location attributes)
 - Ability to override Operation Name
 - Ability to manually set User ID or Authenticated User ID
 - Propagating Operation Name to Dependency Telemetry


> [!WARNING]
> This SDK only works for Node.js environments. Use the [Application Insights JavaScript SDK](https://github.com/microsoft/ApplicationInsights-JS) for web and browser scenarios.


## Get started

Follow the steps in this section to instrument your application with OpenTelemetry.

### Prerequisites

- Azure subscription: [Create an Azure subscription for free](https://azure.microsoft.com/free/)
- Application Insights resource: [Create an Application Insights resource](create-workspace-resource.md#create-a-workspace-based-resource)

- Application using an officially [supported version](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/monitor/monitor-opentelemetry-exporter#currently-supported-environments) of Node.js runtime:
  - [OpenTelemetry supported runtimes](https://github.com/open-telemetry/opentelemetry-js#supported-runtimes)
  - [Azure Monitor OpenTelemetry Exporter supported runtimes](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/monitor/monitor-opentelemetry-exporter#currently-supported-environments)


### Install the library

```sh
npm install applicationinsights@beta
```

The following packages are also used for some specific scenarios described later in this article:

```sh
npm install @opentelemetry/api
npm install @opentelemetry/sdk-trace-base
npm install @opentelemetry/semantic-conventions
npm install @opentelemetry/instrumentation-http
```

### Enable Azure Monitor Application Insights

> *Important:* `applicationinsights` must be setup *and* started *before* you import anything else. There may be resulting telemetry loss if other libraries are imported first.


```typescript
const { Client, Config } = require("applicationinsights");

const config = new Config("<YOUR_CONNECTION_STRING>");
const appInsights = new Client(config);
appInsights.start();
```

* If the Connection String is set in the environment variable
  APPLICATIONINSIGHTS\_CONNECTION\_STRING, `Config` constructor can be called with no
  arguments. This makes it easy to use different connection strings for different
  environments.



## Configuration

The appInsights Config object provides a number of options to setup SDK behavior.

```typescript
const config = new Config("<YOUR_CONNECTION_STRING>");
config.samplingRatio = 1;
config.enableAutoCollectExtendedMetrics = false;
config.instrumentations =  {
  "http": { enabled: true },
  "azureSdk": { enabled: false },
  "mongoDb": { enabled: false },
  "mySql": { enabled: false },
  "postgreSql": { enabled: false },
  "redis": { enabled: false }
};
const appInsights = new Client(config);
appInsights.start();

```



|Property|Description|Default|
| ------------------------------- |------------------------------------------------------------------------------------------------------------|-------|
| endpointUrl                     | The ingestion endpoint to send telemetry payloads.to                                                       | |
| samplingRatio              | Sampling ration must take a value in the range [0,1], 1 meaning all data will sampled and 0 all Tracing data will be sampled out.                       | 1|                             |                                                  |
| enableAutoCollectExternalLoggers| Sets the state of console. If true logger activity will be sent to Application Insights. |
| enableAutoCollectConsole        | Sets the state of logger tracking (enabled by default for third-party loggers only). If true, logger auto collection will include console.log calls. | false |
| enableAutoCollectExceptions     | Sets the state of exception tracking. If true uncaught exceptions will be sent to Application Insights | true|
| enableAutoCollectPerformance    | Sets the state of performance tracking. If true performance counters will be collected every second and sent to Application Insights | true|
| enableAutoCollectStandarddMetrics | Sets the state of Standard Metrics tracking. If true Standard Metrics will be collected every minute and sent to Application Insights | true|
| enableAutoCollectHeartbeat      | Sets the state of request tracking. If true HeartBeat metric data will be collected every 15 minutes and sent to Application Insights | true|
| instrumentations| Allow configuration of OpenTelemetry Instrumentations. |  {"http": { enabled: true },"azureSdk": { enabled: false },"mongoDb": { enabled: false },"mySql": { enabled: false },"postgreSql": { enabled: false },"redis": { enabled: false }}|
| storageDirectory| Directory to store retriable telemetry when it fails to export| `Windows` %TEMP%\Microsoft\AzureMonitor `Non-Windows` %TMPDIR%/Microsoft/AzureMonitor|
| disableOfflineStorage| Disable offline storage when telemetry cannot be exported | false |
| aadTokenCredential| Azure Credential instance to be used to authenticate the App. [AAD Identity Credential Classes](https://github.com/Azure/azure-sdk-for-js/tree/master/sdk/identity/identity#credential-classes) |  |
| extendedMetrics       | Enable/Disable specific extended Metrics(gc, heap and loop).  |{"gc":false,"heap":false,"loop":false}|

[Config.ts]: https://github.com/microsoft/ApplicationInsights-node.js/blob/develop/Library/Config.ts

All these properties except aadTokenCredential could be configured using configuration file `applicationinsights.json` located under root folder of applicationinsights package installation folder, Ex: `node_modules/applicationinsights`. These configuration values will be applied to all TelemetryClients created in the SDK. 


```javascript
{
    "samplingRate": 0.8,
    "enableAutoCollectExternalLoggers": true,
    "enableAutoCollectExceptions": true,
    "enableAutoCollectHeartbeat": true
    ...
}
  
```

Custom JSON file could be provided using `APPLICATIONINSIGHTS_CONFIGURATION_FILE` environment variable.

```javascript
process.env.APPLICATIONINSIGHTS_CONFIGURATION_FILE = "C:/applicationinsights/config/customConfig.json"

// Application Insights SDK setup....
```



## Instrumentation libraries

The following libraries are validated to work with the preview release.

> [!WARNING]
> Instrumentation libraries are based on experimental OpenTelemetry specifications. Microsoft's *preview* support commitment is to ensure that the following libraries emit data to Azure Monitor Application Insights, but it's possible that breaking changes or experimental mapping will block some data elements.

### Distributed Tracing
- Requests/Dependencies
  - [http/https](https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-instrumentation-http/README.md) version:
  [0.33.0](https://www.npmjs.com/package/@opentelemetry/instrumentation-http/v/0.33.0)
  
- Dependencies
  - [mysql](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/plugins/node/opentelemetry-instrumentation-mysql) version:
  [0.25.0](https://www.npmjs.com/package/@opentelemetry/instrumentation-mysql/v/0.25.0)

### Metrics
- [http/https](https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-instrumentation-http/README.md) version:
  [0.33.0](https://www.npmjs.com/package/@opentelemetry/instrumentation-http/v/0.33.0)




## Set the Cloud Role Name and the Cloud Role Instance

You might set the Cloud Role Name and the Cloud Role Instance via [OpenTelemetry Resource](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/resource/sdk.md#resource-sdk) attributes. This step updates Cloud Role Name and Cloud Role Instance from their default values to something that makes sense to your team. They'll appear on the Application Map as the name underneath a node. Cloud Role Name uses `service.namespace` and `service.name` attributes, although it falls back to `service.name` if `service.namespace` isn't set. Cloud Role Instance uses the `service.instance.id` attribute value.


```typescript
const { Client, Config, ResourceManager } = require("applicationinsights");
const { SemanticResourceAttributes } = require("@opentelemetry/semantic-conventions");

const appInsights = new Client(new Config());
const traceResource = ResourceManager.getInstance().getTraceResource();
const metricResource = ResourceManager.getInstance().getMetricResource();
const logResource = ResourceManager.getInstance().getLogResource();

// ----------------------------------------
// Setting role name and role instance
// ----------------------------------------
traceResource[SemanticResourceAttributes.SERVICE_NAME] = "my-helloworld-service";
traceResource[SemanticResourceAttributes.SERVICE_NAMESPACE] = "my-namespace";
traceResource[SemanticResourceAttributes.SERVICE_INSTANCE_ID] = "my-instance";

metricResource[SemanticResourceAttributes.SERVICE_NAME] = "my-helloworld-service";
metricResource[SemanticResourceAttributes.SERVICE_NAMESPACE] = "my-namespace";
metricResource[SemanticResourceAttributes.SERVICE_INSTANCE_ID] = "my-instance";

logResource[SemanticResourceAttributes.SERVICE_NAME] = "my-helloworld-service";
logResource[SemanticResourceAttributes.SERVICE_NAMESPACE] = "my-namespace";
logResource[SemanticResourceAttributes.SERVICE_INSTANCE_ID] = "my-instance";

appInsights.start();
```

For information on standard attributes for resources, see [Resource Semantic Conventions](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/resource/semantic_conventions/README.md).

## Enable Sampling

You may want to enable sampling to reduce your data ingestion volume which reduces your cost. Azure Monitor provides a custom *fixed-rate* sampler that populates events with a "sampling ratio", which Application Insights converts to "ItemCount". This ensures accurate experiences and event counts. The sampler is designed to preserve your traces across services. The sampler expects a sample rate of between 0 and 1 inclusive. A rate of 0.1 means approximately 10% of your telemetry will be sent. 

```typescript
const config = new Config("<YOUR_CONNECTION_STRING>");
config.samplingRate = 0.1;
const appInsights = new Client(config);
appInsights.start();
```

---

> [!TIP]
> If you're not sure where to set the sampling rate, start at 5% (i.e., 0.05 sampling ratio) and adjust the rate based on the accuracy of the operations shown in the failures and performance blades. A higher rate generally results in higher accuracy.


## Modify telemetry

This section explains how to modify telemetry.

### Add span attributes

To add span attributes, use either of the following two ways:

* Use options provided by [instrumentation libraries](#instrumentation-libraries).
* Add a custom span processor.

These attributes might include adding a custom property to your telemetry. You might also use attributes to set optional fields in the Application Insights schema, like Client IP.

> [!TIP]
> The advantage of using options provided by instrumentation libraries, when they're available, is that the entire context is available. As a result, users can select to add or filter more attributes. For example, the enrich option in the HttpClient instrumentation library gives users access to the httpRequestMessage itself. They can select anything from it and store it as an attribute.

#### Add a custom property to a Trace

Any [attributes](#add-span-attributes) you add to spans are exported as custom properties. They populate the _customDimensions_ field in the requests or the dependencies tables in Application Insights.

Use a custom processor:

```typescript
const { Client, Config } = require("applicationinsights");
const { ReadableSpan, Span, SpanProcessor } = require("@opentelemetry/sdk-trace-base");
const { SemanticAttributes } = require("@opentelemetry/semantic-conventions");

const appInsights = new Client(new Config());

class SpanEnrichingProcessor implements SpanProcessor{
    forceFlush(): Promise<void>{
        return Promise.resolve();
    }
    shutdown(): Promise<void>{
        return Promise.resolve();
    }
    onStart(_span: Span): void{}
    onEnd(span: ReadableSpan){
        span.attributes["CustomDimension1"] = "value1";
        span.attributes["CustomDimension2"] = "value2";
        span.attributes[SemanticAttributes.HTTP_CLIENT_IP] = "<IP Address>";
    }
}

const tracerProvider = appInsights.getTraceHandler().getTracerProvider();
tracerProvider.addSpanProcessor(new SpanEnrichingProcessor());
appInsights.start();
```

### Filter telemetry

You might use the following ways to filter out telemetry before it leaves your application.

1. Exclude the URL option provided by many HTTP instrumentation libraries.

    The following example shows how to exclude a certain URL from being tracked by using the [HTTP/HTTPS instrumentation library](https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-instrumentation-http):
    
    ```typescript
    const { Client, Config } = require("applicationinsights");
    const { IncomingMessage } = require("http");
    const { RequestOptions } = require("https");
    const { HttpInstrumentationConfig }= require("@opentelemetry/instrumentation-http");

    const httpInstrumentationConfig: HttpInstrumentationConfig = {
        enabled: true,
        ignoreIncomingRequestHook: (request: IncomingMessage) => {
            // Ignore OPTIONS incoming requests
            if (request.method === 'OPTIONS') {
                return true;
            }
            return false;
        },
        ignoreOutgoingRequestHook: (options: RequestOptions) => {
            // Ignore outgoing requests with /test path
            if (options.path === '/test') {
                return true;
            }
            return false;
        }
    };
    const config = new Config();
    config.instrumentations.http = httpInstrumentationConfig;
    const appInsights = new Client(config);
    appInsights.start();
    
    ```

1. Use a custom processor. You can use a custom span processor to exclude certain spans from being exported. To mark spans to not be exported, set `TraceFlag` to `DEFAULT`.
Use the add [custom property example](#add-a-custom-property-to-a-trace), but replace the following lines of code:

    ```typescript
    ...
    import { SpanKind, TraceFlags } from "@opentelemetry/api";
    
    class SpanEnrichingProcessor implements SpanProcessor{
        ...
    
        onEnd(span: ReadableSpan) {
            if(span.kind == SpanKind.INTERNAL){
                span.spanContext().traceFlags = TraceFlags.NONE;
            }
        }
    }
    ```

## Custom telemetry

This section explains how to collect custom telemetry from your application.

### Add Custom Metrics

You may want to collect metrics beyond what is collected by [instrumentation libraries](#instrumentation-libraries).

The OpenTelemetry API offers six metric "instruments" to cover a variety of metric scenarios and you'll need to pick the correct "Aggregation Type" when visualizing metrics in Metrics Explorer. This requirement is true when using the OpenTelemetry Metric API to send metrics and when using an instrumentation library.


The following table shows the recommended aggregation types] for each of the OpenTelemetry Metric Instruments.

| OpenTelemetry Instrument                             | Azure Monitor Aggregation Type                             |
|------------------------------------------------------|------------------------------------------------------------|
| Counter                                              | Sum                                                        |
| Asynchronous Counter                                 | Sum                                                        |
| Histogram                                            | Average, Sum, Count (Max, Min for Python and Node.js only) |
| Asynchronous Gauge                                   | Average                                                    |
| UpDownCounter (Python and Node.js only)              | Sum                                                        |
| Asynchronous UpDownCounter (Python and Node.js only) | Sum                                                        |

> [!CAUTION]
> Aggregation types beyond what's shown in the table typically aren't meaningful.

The [OpenTelemetry Specification](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/metrics/api.md#instrument)
describes the instruments and provides examples of when you might use each one.

```typescript
    const { Client, Config } = require("applicationinsights");

    const appInsights = new Client(new Config());
    
    const customMetricsHandler = appInsights.getMetricHandler().getCustomMetricsHandler();
    const meter =  customMetricsHandler.getMeter();\

    let histogram = meter.createHistogram("histogram");

    let counter = meter.createCounter("counter");

    let gauge = meter.createObservableGauge("gauge");
    gauge.addCallback((observableResult: ObservableResult) => {
        let randomNumber = Math.floor(Math.random() * 100);
        observableResult.observe(randomNumber, {"testKey": "testValue"});
    });

    appInsights.start();
    histogram.record(1, { "testKey": "testValue" });
    histogram.record(30, { "testKey": "testValue2" });
    histogram.record(100, { "testKey2": "testValue" });

    counter.add(1, { "testKey": "testValue" });
    counter.add(5, { "testKey2": "testValue" });
    counter.add(3, { "testKey": "testValue2" });
```


### Add Custom Exceptions

Select instrumentation libraries automatically support exceptions to Application Insights.
However, you may want to manually report exceptions beyond what instrumention libraries report.
For instance, exceptions caught by your code are *not* ordinarily not reported, and you may wish to report them
and thus draw attention to them in relevant experiences including the failures blade and end-to-end transaction view.

```typescript
const { Client, Config } = require("applicationinsights");

const appInsights = new Client(new Config());
const tracer = appInsights.getTraceHandler().getTracer();
let span = tracer.startSpan("hello");
try{
    throw new Error("Test Error");
}
catch(error){
    span.recordException(error);
}
```

## Troubleshooting

### Self-diagnostics

"Self-diagnostics" refers to internal logging from Application Insights Node.js SDK.

This functionality can be helpful for spotting and diagnosing issues with Application Insights itself.

By default, Application Insights Node.js SDK logs at warning level to console, following code demonstrate how to enable debug logging as well and generate telemetry for internal logs:

```typescript
import { Logger } from "applicationinsights";
import { DiagLogLevel } from "@opentelemetry/api";

Logger.getInstance().updateLogLevel(DiagLogLevel.DEBUG);
```


`APPLICATIONINSIGHTS_INSTRUMENTATION_LOGGING_LEVEL` environment varialbe could be used to set desired log level, supporting the following values: `NONE`, `ERROR`, `WARN`, `INFO`, `DEBUG`, `VERBOSE` and  `ALL`.


Logs could be put into local file using `APPLICATIONINSIGHTS_LOG_DESTINATION` environment variable, supported values are `file` and `file+console`, a file named `applicationinsights.log` will be generated on tmp folder by default, including all logs,  `/tmp` for *nix and `USERDIR/AppData/Local/Temp` for Windows. Log directory could be configured using `APPLICATIONINSIGHTS_LOGDIR` environment variable.

```javascript
process.env.APPLICATIONINSIGHTS_INSTRUMENTATION_LOGGING_LEVEL = "VERBOSE";
process.env.APPLICATIONINSIGHTS_LOG_DESTINATION = "file";
process.env.APPLICATIONINSIGHTS_LOGDIR = "C:/applicationinsights/logs";

// Application Insights SDK setup....
```

## Support
To get support:

TODO We should mention 2 kinds of suppoprt here, our code and OTel code

For OpenTelemetry issues, contact the [OpenTelemetry JavaScript community](https://github.com/open-telemetry/opentelemetry-js) directly.


## Contributing
For details on contributing to this repository, see the [contributing guide](https://github.com/microsoft/ApplicationInsights-node.js/master/CONTRIBUTING.md).

This project welcomes contributions and suggestions. Most contributions require you to agree to a Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us the rights to use your contribution. For details, visit
https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions provided by the bot. You will only need to do this once across all repositories using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

