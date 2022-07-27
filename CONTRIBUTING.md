# Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

# How to contribute to the Application Insights Node.js SDK


1. Fork this repo
2. Clone your fork locally (`git clone https://github.com/<youruser>/ApplicationInsights-node.js
3. Open a terminal and move into your local copy (`cd ApplicationInsights-node.js`)
4. Install all dependencies with `npm install`.
5. Build project 
    ```bash
    npm run build
    ```
6. Run unit tests
    ```bash
    npm run test
    ```
7. Run functional and back compatibility tests, start docker then run following commands:
    ```bash
    npm run functionaltest
    ```
    _Note: Functional tests require Docker_
    
8. Run back compatibility tests to ckeck older version of Node.js runtime and Typescript.
    ```bash
    npm run backcompattest
    ```
---