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
1. Click on your website tile and scroll down to the Console tile. Type the command (as shown above) to install the module from the Node Package Manager. <br/> <img src="https://cloud.githubusercontent.com/assets/8000269/3898723/334d80b8-2270-11e4-9265-fea64fa8c4d9.png" width="600">

2. Scroll to the bottom of your website blade to the Extensions tile. Click the Add button and select Visual Studio Online and add the extension. You may need to refresh the current blade for it to appear on your list of extensions. <br/> <img src="https://cloud.githubusercontent.com/assets/8000269/3898727/335acae8-2270-11e4-9294-a53f68e2bb77.png" width="600">
 
3. Next, scroll to the top and in the Summary tile, click on the section that says Application Insights. Find your Node website in the list and click on it. Then click on the Properties tile and copy your instrumentation key. <br/> <img src="https://cloud.githubusercontent.com/assets/8000269/3898721/334b228c-2270-11e4-82a7-1bb158c3a843.png" width="600"> <br/> <img src="https://cloud.githubusercontent.com/assets/8000269/3898722/334c0e04-2270-11e4-81c9-2f6101ae12a9.png" width="600"> 

4. From the website blade click "site settings". Under the "App settings" section, enter a new key "APPINSIGHTS\_INSTRUMENTATION\_KEY" and paste your instrumentation key into the value field.

5. Go back to your Extensions tile and click on Visual Studio Online to open up the VSO blade. Click the Browse button to open VSO to edit your files. <br/> <img src="https://cloud.githubusercontent.com/assets/8000269/3898729/3361b43e-2270-11e4-9c07-0904f632e514.png" width="600">

6. Once you open VSO, click on the `server.js` file and enter the require statement as stated above. <br/> <img src="https://cloud.githubusercontent.com/assets/8000269/3898728/335aea0a-2270-11e4-9545-27e5d0baac57.png" width="600"> 

7. Open your website and click on a link to generate a request. <br/>

8. Return to your project tile in the Azure Portal. You can view your requests in the Monitoring tile.

### Part Two (Node site running as a NON-Azure website)
#### Creating an Application Insights resource in the Azure Portal
1. First, create a new Application Insights resource in the Azure portal by clicking `New --> Application Insights`. <br/>
<img src="https://cloud.githubusercontent.com/assets/8000269/3830258/71146e8a-1d88-11e4-90c1-06a7bd89673f.png" width="300">

2. Enter a name for your new Application Insights resource and click create. A new tile will appear on your dashboard. <br/>
<img src="https://cloud.githubusercontent.com/assets/8000269/3832826/3b671972-1da1-11e4-869c-49b36ad7c194.png" width="600">

3. Expand your app by clicking on the tile on your dashboard, then click on the Properties tile to open your application's Properties blade to obtain the instrumentation key (iKey). Click on the clipboard next to the iKey to copy it. <br/> 
<img src="https://cloud.githubusercontent.com/assets/8000269/3832828/3b6864da-1da1-11e4-9a1d-6f41324bd775.png" width="600">

4. Set an environment variable named "APPINSIGHTS\_INSTRUMENTATION\_KEY" to the value of your instrumentation key. <br/>

5. Open your `server.js` file that was generated when you installed the module, and entire the require statement as stated above. <br/> <img src="https://cloud.githubusercontent.com/assets/8000269/3899210/209207fc-2278-11e4-960b-1b5144d73718.png" width="600">

6. Run your application and generate a request. <br/>

7. Return to your project tile in the Azure Portal and you can view your requests in the Requests tile in your application's blade. (In my example, you can see that I have generate 10 requests and it took 1 ms to process them). <br/>
<img src="https://cloud.githubusercontent.com/assets/8000269/3832825/3b66974a-1da1-11e4-87f2-774cb2746c30.png" width="600">