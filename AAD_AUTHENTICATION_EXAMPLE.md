# AAD Authentication Example

This example demonstrates how to use Azure Active Directory (AAD) authentication with Application Insights when local authentication is disabled.

## Problem

When local authentication is disabled in Azure Monitor, you need to provide AAD credentials. However, setting the credential after calling `start()` doesn't work because the client is already initialized.

## Solution

Use the new `setAadCredential()` method BEFORE calling `start()`:

```javascript
const appInsights = require('applicationinsights');
const {DefaultAzureCredential} = require('@azure/identity');

// Create the credential
const credential = new DefaultAzureCredential();

// Set up Application Insights with AAD credential
appInsights
    .setup('InstrumentationKey=your-key-here')
    .setInternalLogging(true, true)
    .setAadCredential(credential)  // Set credential BEFORE start()
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true)
    .setSendLiveMetrics(true)
    .start();

// Now track telemetry - AAD authentication will work
const client = appInsights.defaultClient;
client.trackEvent({name: "my custom event", properties: {customProperty: "custom property value"}});
client.trackException({exception: new Error("handled exceptions can be logged with this method")});
client.trackMetric({name: "customMetric", value: 3});
client.trackTrace({message: "trace message"});
client.flush();
```

## What Changed

- **Before**: Users had to set `client.config.aadTokenCredential` after `start()`, which didn't work
- **After**: Users call `setAadCredential(credential)` before `start()`, which works correctly

The new method will warn you if you try to use it after the client is already initialized, helping you understand the correct usage pattern.