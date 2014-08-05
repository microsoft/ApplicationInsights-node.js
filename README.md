# AppInsights for Node.js

[Node](http://nodejs.org/) is a popular, lightweight platform for building fast and scalable network applications. Our mission was to extend our Application Insights (AI) API surface to Node.js to support users developing on a different platform. [Application Insights](http://msdn.microsoft.com/en-us/library/dn481095.aspx) is a service that allows developers to keep their application available, performing and succeeding. This node module will automatically send request telemetry and exceptions and logs for requests to the Application Insights service where they can be visualized in the [Azure Portal](https://portal.azure.com/). 

## Set-Up
Access to the source code is available from [GitHub](https://github.com/Microsoft/AppInsights-node.js). 

Before you get started, you need to create a Node Web application to add the Node Request Monitoring Module to. 
 
### Installing From Node Package Manager

Navigate to the folder where you want to install the module then open a command window and type: 

    npm install appInsights

After you install the node package, it will create new folder called `node_modules` and a new folder called `appInsights` within that folder. 
It will also create an `ai.config.json` file where you will manually insert your instrumentation key or iKey (detailed in step 4 below).
Depending on what you want to track, you need to specify that you want to use the module in your project using a require statement:

```javascript
require('appInsights');
```

#### Example experience configuring Node module through Microsoft Azure Portal
1. First, create a new Application Insights project. <br/>
<img src="https://cloud.githubusercontent.com/assets/8000269/3817787/705b0a56-1cdb-11e4-9d29-7102cbc28984.png" width="300">

2. Enter a name for your new AI project and click create. A new tile will appear on your dashboard. <br/>
<img src="https://cloud.githubusercontent.com/assets/8000269/3817839/f99e1830-1cdb-11e4-9082-0bb6fdb9e25a.png" width="600">

3. Expand your app by clicking on the tile on your dashboard, then click on the Quick Start tile on your application's blade. <br/> <img src="https://cloud.githubusercontent.com/assets/8000269/3818177/e3455992-1cde-11e4-88e2-2606aa36d3fe.png" width="600">

4. From the Quick Start blade, click on the End-User Analytics Code link to obtain your instrumentation iKey. <br/>
<img src="https://cloud.githubusercontent.com/assets/8000269/3818209/33589d90-1cdf-11e4-97d7-84b913250ce8.png" width="600">

5. Copy and paste your iKey into the iKey variable in your `ai.config.json` file. <br/>
<img src="https://cloud.githubusercontent.com/assets/8000269/3818833/a0c94424-1ce4-11e4-8ea1-67e48ee1db4c.png" width="600">

6. Run your application and generate a request. <br/>
7. Return to your project tile in the Azure Portal and you can view your requests in the Requests tile in your application's blade. (In my example, you can see that I have generate 16 requests and it took 1 ms to process them). <br/>
<img src="https://cloud.githubusercontent.com/assets/8000269/3819385/353b039a-1cea-11e4-96a2-6cc3204ed88f.png" width="600">