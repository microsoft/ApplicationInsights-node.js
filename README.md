# Application Insights for Node.js

[Node](http://nodejs.org/) is a popular, lightweight platform for building fast and scalable network applications. This project extends Application Insights API surface to support Node.js. [Application Insights](http://msdn.microsoft.com/en-us/library/dn481095.aspx) is a service that allows developers to keep their application available, performing and succeeding. This node module will automatically send request telemetry, exceptions and logs for requests to the Application Insights service where they can be visualized in the [Azure Portal](https://portal.azure.com/). 

## Set-Up
Access to the source code is available from [GitHub](https://github.com/Microsoft/AppInsights-node.js). 

To use the Node Request Monitoring Module, you need an Application Insights Resource. The Application Insights Resource has an instrumentation key (iKey) that is unique to your application for monitoring. 

If your Node site is running as an Azure Website, an Application Insights resource already exists for your application. See part one if your Node site is an Azure website, or part two if your Node site is not an Azure website.

### Installing From Node Package Manager

Navigate to the folder where you want to install the module then open a command window and type: 

    npm install applicationinsights

After you install the node package, it will create new folder called `node_modules` and a new folder called `applicationinsights` within that folder. 
It will also create an `ai.config.json` file where you will manually insert your instrumentation key or iKey (detailed in steps 3 and 4 below).
Depending on what you want to track, you need to specify that you want to use the module in your project using a require statement:

```javascript
require('applicationinsights');
```

### Part One (Node site running as an Azure website)
Coming soon

### Part Two (Node site running as a NON-Azure website)
#### Creating an Application Insights resource in the Azure Portal
1. First, create a new Application Insights resource in the Azure portal by clicking `New --> Application Insights`. <br/>
<img src="https://cloud.githubusercontent.com/assets/8000269/3830258/71146e8a-1d88-11e4-90c1-06a7bd89673f.png" width="300">

2. Enter a name for your new AI project and click create. A new tile will appear on your dashboard. <br/>
<img src="https://cloud.githubusercontent.com/assets/8000269/3832826/3b671972-1da1-11e4-869c-49b36ad7c194.png" width="600">

3. Expand your app by clicking on the tile on your dashboard, then click on the Properties tile to open your application's Properties blade to obtain the instrumentation key (iKey). Click on the clipboard next to the iKey to copy it. <br/> 
<img src="https://cloud.githubusercontent.com/assets/8000269/3832828/3b6864da-1da1-11e4-9a1d-6f41324bd775.png" width="600">

4. Copy and paste your iKey into the iKey variable in your `ai.config.json` file. <br/>
<img src="https://cloud.githubusercontent.com/assets/8000269/3833430/706d3a60-1da7-11e4-85f1-430240d823fa.png" width="600">

5. Run your application and generate a request. <br/>
6. Return to your project tile in the Azure Portal and you can view your requests in the Requests tile in your application's blade. (In my example, you can see that I have generate 10 requests and it took 1 ms to process them). <br/>
<img src="https://cloud.githubusercontent.com/assets/8000269/3832825/3b66974a-1da1-11e4-87f2-774cb2746c30.png" width="600">