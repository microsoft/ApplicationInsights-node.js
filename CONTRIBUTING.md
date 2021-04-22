## Contributing

1. Install all dependencies with `npm install`.
2. Set an environment variable to your instrumentation key (optional).
    ```bash
    // windows
    set APPINSIGHTS_INSTRUMENTATIONKEY=<insert_your_instrumentation_key_here>
    // linux/macos
    export APPINSIGHTS_INSTRUMENTATIONKEY=<insert_your_instrumentation_key_here>
    ```
3. Run tests
    ```bash
    npm run test
    npm run backcompattest
    npm run functionaltest
    ```
    _Note: Functional tests require Docker_

---