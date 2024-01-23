# Application Insights for Node.js (Beta)

Application Insights SDK monitors your backend services and components after
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
Application Insights SDK internally consumes [Azure Monitor OpenTelemetry for JavaScript](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/monitor/monitor-opentelemetry), all relevant documentation is available in that package repository, it also exposes previous functionalities and APIs that were previously available to have a smother transtion for customers using previous versions of the package, including manual track APIs, for new customers we recommend to use @azure/monitor-opentelemetry instead.

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

### Enable Application Insights

> *Important:* `useAzureMonitor` must be called *before* you import anything else. There may be resulting telemetry loss if other libraries are imported first.


```typescript
const { useAzureMonitor, AzureMonitorOpenTelemetryOptions } = require("applicationinsights");

const config : AzureMonitorOpenTelemetryOptions = {
    azureMonitorExporterOptions: {
        connectionString: process.env["APPLICATIONINSIGHTS_CONNECTION_STRING"] || "<your connection string>"
    }
};
useAzureMonitor(config);
```

* If the Connection String is set in the environment variable
  APPLICATIONINSIGHTS\_CONNECTION\_STRING, `TelemetryClient` constructor can be called with no
  arguments. This makes it easy to use different connection strings for different
  environments.


## Configuration

The ApplicationInsightsConfig interface provides a number of options to setup SDK behavior.

```typescript
const config : AzureMonitorOpenTelemetryOptions = {
     azureMonitorExporterOptions: {
        // Offline storage
        storageDirectory: "c://azureMonitor",
        // Automatic retries
        disableOfflineStorage: false,
        // Application Insights Connection String
        connectionString:   process.env["APPLICATIONINSIGHTS_CONNECTION_STRING"] || "<your connection string>",
    },
    samplingRatio: 1,
    enableAutoCollectExceptions: true,
    enableAutoCollectStandardMetrics: true,
    enableAutoCollectPerformance: true,
    instrumentationOptions: {
        azureSdk: { enabled: true },
        http: { enabled: true },
        mongoDb: { enabled: true },
        mySql: { enabled: true },
        postgreSql: { enabled: true },
        redis: { enabled: true },
        redis4: { enabled: true },
    },
    resource: resource,
    logInstrumentationOptions: {
        console: { enabled: true},
        bunyan: { enabled: true},
        winston: { enabled: true},
    },
    extendedMetrics:{
        gc: true,
        heap: true,
        loop: true
    }

};
useAzureMonitor(config);

```



|Property|Description|Default|
| ------------------------------- |------------------------------------------------------------------------------------------------------------|-------|
| ...                     | Azure Monitor OpenTelemetry Configuration   [More info here](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/monitor/monitor-opentelemetry#configuration)                                                | |
| otlpTraceExporterConfig                     |  OTLP Trace Exporter Configurationon   [More info here](https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/exporter-trace-otlp-http)                                                | |
| otlpMetricExporterConfig                     |  OTLP Metric Exporter Configuration  [More info here](https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-exporter-metrics-otlp-http)                                                | |
| otlpLogExporterConfig                     | OTLP Log Exporter Configuration   [More info here](https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/exporter-logs-otlp-http)                                                | |
| enableAutoCollectExceptions     | Sets the state of exception tracking. If true uncaught exceptions will be sent to Application Insights | true|
| enableAutoCollectPerformance     | Sets the state of Performance Counters. If true Performance Counters will be sent to Application Insights | true|
| logInstrumentationOptions| Allow configuration of Log Instrumentations. |  {"console": { enabled: false },"bunyan": { enabled: false },"winston": { enabled: false }}|
| extendedMetrics       | Enable/Disable specific extended Metrics(gc, heap and loop).  |{"gc":false,"heap":false,"loop":false}|

Configuration could be set using configuration file  `applicationinsights.json` located under root folder of applicationinsights package installation folder, Ex: `node_modules/applicationinsights`. 


```json
{
    "azureMonitorExporterOptions": {"connectionString":"<YOUR_CONNECTION_STRING>"},
    "samplingRatio": 0.8,
    "enableAutoCollectExceptions": true,
    "instrumentationOptions":{
        "azureSdk": {
            "enabled": false
        }
    },
    "logInstrumentationOptions":{
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

## ApplicationInsights Shim Unsupported Properties
The ApplicationInsights shim will provide support path for customers who only require basic instrumentation as opposed to migrating to Azure Monitor OpenTelemetry. If unsupported methods are called, they are not breaking and your application will still run. Calling these unsupported methods will throw a warning that the method is not supported by the ApplicationInsights shim.

The following methods are called after using the below method.

```javascript
let applicationinsights = require("applicationinsights");
appinsights.setup("<YOUR_CONNECTION_STRING>").start();
```

And invoked via `appInsights.<METHOD_NAME>`
|Property                     |Support Status                                                                                              |
| ----------------------------|------------------------------------------------------------------------------------------------------------|
| setDistributedTracingMode   | AI only tracing mode is no longer supported. Migrate to using W3C_AND_AI tracing mode. |
| setAutoCollectHeartbeat     | Heartbeat is not supported in either Azure Monitor OpenTelemetry or the shim.|
| enableWebInstrumenatation   | WebInstrumentation is not supported in the shim, but is available in Azure Monitor OpenTelemetry as `enableBrowserSdkLoader` |
| setAutoDependencyCorrelation| Turning off autoDependencyCorrelation is not supported by either Azure Monitor OpenTelemetry or the shim. |
| setUseDiskRetryCaching      | While enabling/disabling offline storage is supported, setting the resend interval or the maxBytesOnDisk values are not supported in the shim or Azure Monitor OpenTelemetry. |
| setAutoCollectIncomingRequestAzureFunctions | Auto collection of Azure Functions is not supported by the shim or Azure Monitor OpenTelemetry. |

The following configurations are set using either environment variables, setting them in the `applicationinsights.json` file or by calling `appInsights.defaultClient.config.<CONFIG_SETTING_VALUE>;`.

|Property               |Support Status                                                         |
|-----------------------|-----------------------------------------------------------------------|
| instrumentationKey & endpointUrl | Not supported by the shim or Azure Monitor OpenTelemetry. Please migrate to using the connectionString. |
| maxBatchSize | Not supported by the shim but can be configured by using OpenTelemetry SpanProcessors in Azure Monitor OpenTelemetry. |
| disableAppInsights | Not supported by the shim. Disabling telemetry export is possible via Azure Monitor OpenTelemetry using OpenTelemetry.|
| correlationIdRetryIntervalMs | Not supported by either the shim or Azure Monitor OpenTelemetry as correlation ID is deprecated.|
| ignoreLegacyHeaders | Legacy headers in outgoing requests are not supported in the shim or Azure Monitor OpenTelemetry. Therefore they will always be disabled. |
| distributedTracingMode | Distributed tracing mode is always set to AI_AND_W3C. AI only tracing mode is not supported in the shim or Azure Monitor OpenTelemetry.|
| enableLoggerErrorToTrace | Not supported in the shim or Azure Monitor OpenTelemetry as all errors will be logged as exceptions in both. |
| enableAutoCollectHeartbeat | Heartbeat is not supported in the shim or Azure Monitor OpenTelemetry as it is deprecated. |
| enableAutoDependencyCorrelation | Cannot disable dependency correlation in either the shim or Azure Monitor OpenTelemetry. Dependency correlation will always be enabled and therefore this setting is always true. |
| enableAutoCollectIncomingRequestAzureFunctions | Auto collection of Azure Functions is not supported by the shim or Azure Monitor OpenTelemetry. |
| enableUseAsyncHooks | Using async hooks is not supported by the shim or Azure Monitor OpenTelemetry as it is not supported by OpenTelemetry. |
| enableResendInterval | Not supported by the shim. It is possible to configure the interval between exports via OpenTelemetry span processors, but not specifically cached events. The @azure/monitor-opentelemetry-exporter uses a resend interval of one minute. |
| enableMaxBytesOnDisk | Not supported by the shim. And not supported to be changed in Azure Monitor OpenTelemetry. The @azure/monitor-opentelemetry-exporter sets this value at 50MB. |
| noHttpAgentKeepAlive | Not supported in the shim or Azure Monitor OpenTelemetry. |
| httpAgent/httpsAgent | Not supported in the shim or Azure Monitor OpenTelemetry. |
| enableWebInstrumentation | Not currently supported in the shim, but is in Azure Monitor OpenTelemetry as `enableBrowserSdkLoader`. |
| webInstrumentationConnectionString | Not supported in the shim, but is in Azure Monitor OpenTelemetry as `browserSdkLoaderConnectionString`. |
| webInstrumentationConfig | Not currently supported by the shim, or Azure Monitor OpenTelemetry. |
| enableAutoCollectPerformance | Not supported in the shim. |
| enableAutoCollectConsole | Not supported in the shim. |
| enableAutoCollectExternalLoggers | Not supported in the shim. |
| enableAutoCollectExceptions | Not supported in the shim. |
| maxBatchIntervalMs | Not supported in the shim. |
| enableAutoCollectExtendedMetrics | Not supported in the shim. |
| extendedMetricDisablers | Not supported in the shim. |
| disableAllExtendedMetrics | Not supported in the shim. |

The following methods are part of the `TelemetryClient` class. They can be called using `applicationinsights.defaultClient.<METHOD_NAME>()`.

|Property       |                     Support Status              |
|---------------|-------------------------------------------------|
| trackPageView | PageViewTelemetry requires an id and a name field now instead of only an optional name field. |
| track | Tracking generic telemetry is not longer supported. Please use one of the other manual track methods to track a specific telemetry type. | 
| getAuthorizationHandler | Not supported in the shim. |
| addTelemetryProcessor | TelemetryProcessors are not supported in the shim. Please migrate to Azure Monitor OpenTelemetry and use OpenTelemetry Span Processors. |
| clearTelemetryProcessors | TelemetryProcessors are not supported in the shim. Please migrate to Azure Monitor OpenTelemetry and use OpenTelemetry Span Processors. | 
| runTelemetryProcessors | TelemetryProcessors are not supported in the shim. Please migrate to Azure Monitor OpenTelemetry and use OpenTelemetry Span Processors. |
| trackNodeHttpRequestSync | Not supported. Please use the trackRequest method instead. |
| trackNodeHttpRequest | Not supported. Please use the trackRequest method instead. |
| trackNodeHttpDependency | Not supported. Please use the trackDependency method instead. |


## Troubleshooting

### Self-diagnostics


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
