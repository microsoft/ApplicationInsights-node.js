# Azure Monitor Application Insights Distro for Node.js (Preview)



Azure Monitor Application Insights Distro SDK monitors your backend services and components after
you deploy them to help you discover and rapidly diagnose performance and other
issues. Add this SDK to your Node.js services to include deep info about Node.js
processes and their external dependencies such as database and cache services.
You can use this SDK for your Node.js services hosted anywhere: your datacenter,
Azure VMs and Web Apps, and even other public clouds. This solution is based on OpenTelemetry, to learn more about OpenTelemetry concepts, see the [OpenTelemetry overview](opentelemetry-overview.md) or [OpenTelemetry FAQ](/azure/azure-monitor/faq#opentelemetry).

> *Important:* The Azure Monitor OpenTelemetry-based Offerings for Node.js applications are currently in preview.
> See the [Supplemental Terms of Use for Microsoft Azure Previews](https://azure.microsoft.com/support/legal/preview-supplemental-terms/) for legal terms that apply to Azure features that are in beta, preview, or otherwise not yet released into general availability.

[Azure Application Insights]: https://azure.microsoft.com/documentation/articles/app-insights-overview/
[discover and rapidly diagnose performance and other issues]: https://docs.microsoft.com/azure/application-insights/app-insights-detect-triage-diagnose


## Limitations of current preview release

Consider whether this preview is right for you. It *enables distributed tracing, metrics, logs* and _excludes_:

 - Live Metrics
 - Autopopulation of Cloud Role Name and Cloud Role Instance in Azure environments
 - Autopopulation of User ID and Authenticated User ID when you use the Application Insights JavaScript SDK
 - Autopopulation of User IP (to determine location attributes)
 - Ability to override Operation Name
 - Ability to manually set User ID or Authenticated User ID
 - Propagating Operation Name to Dependency Telemetry


> *Warning:* This SDK only works for Node.js environments. Use the [Application Insights JavaScript SDK](https://github.com/microsoft/ApplicationInsights-JS) for web and browser scenarios.


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

> *Important:* `ApplicationInsightsClient` must be setup *and* started *before* you import anything else. There may be resulting telemetry loss if other libraries are imported first.


```typescript
const { ApplicationInsightsClient, ApplicationInsightsConfig } = require("applicationinsights");

const config = new ApplicationInsightsConfig();
config.connectionString = "<YOUR_CONNECTION_STRING>";
const appInsights = new ApplicationInsightsClient(config);
appInsights.start();
```

* If the Connection String is set in the environment variable
  APPLICATIONINSIGHTS\_CONNECTION\_STRING, `ApplicationInsightsConfig` constructor can be called with no
  arguments. This makes it easy to use different connection strings for different
  environments.



## Configuration

The ApplicationInsightsConfig object provides a number of options to setup SDK behavior.

```typescript
const config = new ApplicationInsightsConfig();
config.connectionString = "<YOUR_CONNECTION_STRING>";
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
const appInsights = new ApplicationInsightsClient(config);
appInsights.start();

```



|Property|Description|Default|
| ------------------------------- |------------------------------------------------------------------------------------------------------------|-------|
| connectionString                     | Application Insights Resource Connection String                                                    | |
| samplingRatio              | Sampling ratio must take a value in the range [0,1], 1 meaning all data will sampled and 0 all Tracing data will be sampled out.                       | 1|
| enableAutoCollectExceptions     | Sets the state of exception tracking. If true uncaught exceptions will be sent to Application Insights | true|
| enableAutoCollectPerformance    | Sets the state of performance tracking. If true performance counters will be collected every second and sent to Application Insights | true|
| enableAutoCollectStandardMetrics | Sets the state of Standard Metrics tracking. If true Standard Metrics will be collected every minute and sent to Application Insights | true|
| enableAutoCollectHeartbeat      | Sets the state of request tracking. If true HeartBeat metric data will be collected every 15 minutes and sent to Application Insights | true|
| storageDirectory| Directory to store retriable telemetry when it fails to export| `Windows` %TEMP%\Microsoft\AzureMonitor `Non-Windows` %TMPDIR%/Microsoft/AzureMonitor|
| disableOfflineStorage| Disable offline storage when telemetry cannot be exported | false |
| aadTokenCredential| Azure Credential instance to be used to authenticate the App. [AAD Identity Credential Classes](https://github.com/Azure/azure-sdk-for-js/tree/master/sdk/identity/identity#credential-classes) |  |
| instrumentations| Allow configuration of OpenTelemetry Instrumentations. |  {"http": { enabled: true },"azureSdk": { enabled: false },"mongoDb": { enabled: false },"mySql": { enabled: false },"postgreSql": { enabled: false },"redis": { enabled: false }}|
| logInstrumentations| Allow configuration of Log Instrumentations. |  {"console": { enabled: false },"bunyan": { enabled: false },"winston": { enabled: false }}|
| extendedMetrics       | Enable/Disable specific extended Metrics(gc, heap and loop).  |{"gc":false,"heap":false,"loop":false}|
| resource       | Specify custom Opentelemetry Resource.   ||

All these properties except aadTokenCredential and resource could be configured using configuration file `applicationinsights.json` located under root folder of applicationinsights package installation folder, Ex: `node_modules/applicationinsights`. These configuration values will be applied to all ApplicationInsightsClients created in the SDK. 


```json
{
    "connectionString": "<YOUR_CONNECTION_STRING>",
    "samplingRatio": 0.8,
    "enableAutoCollectExceptions": true,
    "enableAutoCollectHeartbeat": true,
    "instrumentations":{
        "azureSdk": {
            "enabled": false
        }
    },
    "logInstrumentations":{
        "console": {
            "enabled": true
        }
    }
    ...
}
  
```

Custom JSON file could be provided using `APPLICATIONINSIGHTS_CONFIGURATION_FILE` environment variable.

```javascript
process.env.APPLICATIONINSIGHTS_CONFIGURATION_FILE = "C:/applicationinsights/config/customConfig.json"

// Application Insights SDK setup....
```



## Instrumentation libraries

The following OpenTelemetry Instrumentation libraries are included as part of Azure Monitor Application Insights Distro.

> *Warning:* Instrumentation libraries are based on experimental OpenTelemetry specifications. Microsoft's *preview* support commitment is to ensure that the following libraries emit data to Azure Monitor Application Insights, but it's possible that breaking changes or experimental mapping will block some data elements.

### Distributed Tracing

  - [HTTP/HTTPS](https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-instrumentation-http)
  - [MongoDB](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/plugins/node/opentelemetry-instrumentation-mongodb)
  - [MySQL](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/plugins/node/opentelemetry-instrumentation-mysql)
  - [Postgres](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/plugins/node/opentelemetry-instrumentation-pg)
  - [Redis](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/plugins/node/opentelemetry-instrumentation-redis)
  - [Redis-4](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/plugins/node/opentelemetry-instrumentation-redis-4)
  - [Azure SDK](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/instrumentation/opentelemetry-instrumentation-azure-sdk)

### Metrics
- [HTTP/HTTPS](https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-instrumentation-http) 

Other OpenTelemetry Instrumentations are available [here](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/plugins/node) and could be added using TraceHandler in ApplicationInsightsClient.

 ```typescript
    const { ApplicationInsightsClient, ApplicationInsightsConfig } = require("applicationinsights");
    const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');

    const appInsights = new ApplicationInsightsClient(new ApplicationInsightsConfig());
    const traceHandler = appInsights.getTraceHandler();
    traceHandler.addInstrumentation(new ExpressInstrumentation());
    appInsights.start();
    
```

## Set the Cloud Role Name and the Cloud Role Instance

You might set the Cloud Role Name and the Cloud Role Instance via [OpenTelemetry Resource](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/resource/sdk.md#resource-sdk) attributes. This step updates Cloud Role Name and Cloud Role Instance from their default values to something that makes sense to your team. They'll appear on the Application Map as the name underneath a node. Cloud Role Name uses `service.namespace` and `service.name` attributes, although it falls back to `service.name` if `service.namespace` isn't set. Cloud Role Instance uses the `service.instance.id` attribute value.


```typescript
const { ApplicationInsightsClient, ApplicationInsightsConfig } = require("applicationinsights");
const { Resource } = require("@opentelemetry/resources");
const { SemanticResourceAttributes } = require("@opentelemetry/semantic-conventions");

// ----------------------------------------
// Setting role name and role instance
// ----------------------------------------
const customResource = Resource.EMPTY;
resource.attributes[SemanticResourceAttributes.SERVICE_NAME] = "my-helloworld-service";
resource.attributes[SemanticResourceAttributes.SERVICE_NAMESPACE] = "my-namespace";
resource.attributes[SemanticResourceAttributes.SERVICE_INSTANCE_ID] = "my-instance";

let config = new ApplicationInsightsConfig();
config.resource = customResource;
const appInsights = new ApplicationInsightsClient(config);
appInsights.start();
```

For information on standard attributes for resources, see [Resource Semantic Conventions](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/resource/semantic_conventions/README.md).

## Enable Sampling

You may want to enable sampling to reduce your data ingestion volume which reduces your cost. Azure Monitor provides a custom *fixed-rate* sampler that populates events with a "sampling ratio", which Application Insights converts to "ItemCount". This ensures accurate experiences and event counts. The sampler is designed to preserve your traces across services. The sampler expects a sample rate of between 0 and 1 inclusive. A rate of 0.1 means approximately 10% of your telemetry will be sent. 

```typescript
const config = new ApplicationInsightsConfig();
config.connectionString = "<YOUR_CONNECTION_STRING>";
config.samplingRatio = 0.1;
const appInsights = new ApplicationInsightsClient(config);
appInsights.start();
```

---

> *Tip:* If you're not sure where to set the sampling rate, start at 5% (i.e., 0.05 sampling ratio) and adjust the rate based on the accuracy of the operations shown in the failures and performance blades. A higher rate generally results in higher accuracy.


## Modify telemetry

This section explains how to modify telemetry.

### Add span attributes

To add span attributes, use either of the following two ways:

* Use options provided by [instrumentation libraries](#instrumentation-libraries).
* Add a custom span processor.

These attributes might include adding a custom property to your telemetry. You might also use attributes to set optional fields in the Application Insights schema, like Client IP.

> *Tip:* The advantage of using options provided by instrumentation libraries, when they're available, is that the entire context is available. As a result, users can select to add or filter more attributes. For example, the enrich option in the HttpClient instrumentation library gives users access to the httpRequestMessage itself. They can select anything from it and store it as an attribute.

#### Add a custom property to a Trace

Any [attributes](#add-span-attributes) you add to spans are exported as custom properties. They populate the _customDimensions_ field in the requests or the dependencies tables in Application Insights.

Use a custom processor:

```typescript
const { ApplicationInsightsClient, ApplicationInsightsConfig } = require("applicationinsights");
const { ReadableSpan, Span, SpanProcessor } = require("@opentelemetry/sdk-trace-base");
const { SemanticAttributes } = require("@opentelemetry/semantic-conventions");

const appInsights = new ApplicationInsightsClient(new ApplicationInsightsConfig());

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
    const { ApplicationInsightsClient, ApplicationInsightsConfig } = require("applicationinsights");
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
    const config = new ApplicationInsightsConfig();
    config.instrumentations.http = httpInstrumentationConfig;
    const appInsights = new ApplicationInsightsClient(config);
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

>> *Caution:* Aggregation types beyond what's shown in the table typically aren't meaningful.

The [OpenTelemetry Specification](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/metrics/api.md#instrument)
describes the instruments and provides examples of when you might use each one.

```typescript
    const { ApplicationInsightsClient, ApplicationInsightsConfig } = require("applicationinsights");

    const appInsights = new ApplicationInsightsClient(new ApplicationInsightsConfig());
    
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
const { ApplicationInsightsClient, ApplicationInsightsConfig } = require("applicationinsights");

const appInsights = new ApplicationInsightsClient(new ApplicationInsightsConfig());
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

Azure Monitor Application Insights Distro uses the OpenTelemetry API Logger for internal logs. To enable it, use the following code:

```typescript
import { ApplicationInsightsClient, ApplicationInsightsConfig } from "applicationinsights";
import { DiagLogLevel } from "@opentelemetry/api";

const appInsights = new ApplicationInsightsClient(new ApplicationInsightsConfig());
const logger = appInsights.getLogger();
logger.updateLogLevel(DiagLogLevel.DEBUG);
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

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft trademarks or logos is subject to and must follow [Microsoft’s Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general). Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship. Any use of third-party trademarks or logos are subject to those third-party’s policies.

## License

[MIT](LICENSE)
