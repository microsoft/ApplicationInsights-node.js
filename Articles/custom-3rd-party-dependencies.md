# Logging Dependencies for Custom/Unsupported Libraries

If a 3rd party library your application is using is not automatically instrumented by the Application Insights Node.js SDK, you can still manually send Dependency Telemetry via the SDK's `trackDependency` API.

## 1. Propagating the Current Context to your Dependency

This SDK will automatically try to read the current correlation context, if available. For libraries which are purely synchronous (e.g. no promises or callbacks), this will already be done for you and you and you can skip this step. For all other libraries, you must give it pass along the context.

This SDK exports out two functions which can be used for propagation: `getCorrelationContext` and `wrapWithCorrelationContext`. You simply need to wrap the callback where you will eventually be logging your telemetry with the `wrapWithCorrelationContext` function.

```js
const wrappedCallback = appInsights.wrapWithCorrelationContext(cb);
```

## 2. Sending the Tracked Dependency Call

Once your correlation is set up properly, you can now call `trackDependency` using the `defaultClient`. [Here is an example](https://github.com/microsoft/ApplicationInsights-node.js/blob/develop/AutoCollection/diagnostic-channel/postgres.sub.ts#L16-L24) of how it is called for PostgreSQL dependencies. The correlation context will automatically be picked up by the SDK if it was made available by the previous step.

## Example

Given a library `"some-sql"`:

```js
export function querySqlPromise(query) {
    // Runs a query and returns result as Promise
}

export function querySqlCb(ms, cb) {
    // Runs a query and passes result through the Callback
}
```

By default, the contexts provided in either of our callback methods will probably not be propagated correctly, since they spawn new async contexts separate from where our existing one is stored in the Node.js runtime.

```js
import * as someSql from "some-sql";

function logDependency(query, duration, success) {
    appInsights.defaultClient.trackDependency({
        target: "localhost:8080",
        data: query, // string
        name: query, // string
        duration: duration,
        success: success,
        resultCode: success ? "0" : "1",
        dependencyTypeName: "sql"
    });
}

// Some Express HTTP Handler
function myHttpHandler(req, res) {
    const query = "SELECT * FROM TABLE";
    const start = Date.now();

    const someCB = () => {
        logDependency(query, Date.now() - start, true);
    }
    const wrappedCB = appInsights.wrapWithCorrelationContext(someCB);

    someSql.querySqlPromise(query).then(() => {
        // May not be correlated properly
        someCB();

        // Will be correlated properly
        wrappedCB();
    });

    someSql.querySqlCb(query, () => {
        // May not be correlated properly
        someCB();

        // Will be correlated properly
        wrappedCB();
    });
}
```
