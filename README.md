# Application Insights for Node.js

>Node.js® is a platform built on Chrome's JavaScript runtime for easily building fast, scalable network applications. Node.js uses an event-driven, non-blocking I/O model that makes it lightweight and efficient, perfect for data-intensive real-time applications that run across distributed devices.

>-- <cite>[nodejs.org](http://nodejs.org/)</cite>

This project extends the Application Insights API surface to support Node.js. [Application Insights](http://azure.microsoft.com/en-us/services/application-insights/) is a service that allows developers to keep their application available, performing and succeeding. This Python module will allow you to send telemetry of various kinds (event, trace, exception, etc.) to the Application Insights service where they can be visualized in the Azure Portal. 




## Requirements ##
**Install**
```
npm install applicationinsights
```
**Get an instrumentation key**
>**Note**: an instrumentation key is required before any data can be sent. Please see the "[Getting an Application Insights Instrumentation Key](https://github.com/Microsoft/AppInsights-Home/wiki#getting-an-application-insights-instrumentation-key)" section of the wiki for more information. To try the SDK without an instrumentation key, set the instrumentationKey config value to a non-empty string.




## Usage ##
**Configuration**
```javascript
import aiModule = require("applicationInsights");

var appInsights = new aiModule.NodeAppInsights({
	instrumentationKey: "<guid>" // see "Requirements" section to get a key
});
```
**Track events/metrics/traces/exceptions**
```javascript
appInsights.trackTrace("example trace");
appInsights.trackEvent("example event");
appInsights.trackException(new Error("example error"), "handledAt");
appInsights.trackMetric("example metric", 1);
```
**Track all http.Server requests**
```javascript
// wraps http.Server to inject request tracking
appInsights.trackAllHttpServerRequests();

var port = process.env.port || 0;
var server = http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World\n');
}).listen(port);
```
**Track uncaught exceptions**
```javascript
// listens for process.on("uncaughtException", ...);
// when an exception is thrown, calls trackException and re-throws the Error.
appInsights.trackAllUncaughtExceptions();
```



## Contributing ##
**Development environment**

* Install [Visual Studio](http://www.visualstudio.com/)
* Install [Node.js tools for Visual Studio](http://nodejstools.codeplex.com/)
* Install [git tools for windows](http://git-scm.com/download/win)
* Install [Node.js](http://nodejs.org/)
* Install test dependencies
```
npm install node-mocks-http
npm install async
```
* (optional) Set an environment variable to your instrumentation key
```
set APPINSIGHTS_INSTRUMENTATION_KEY=<insert_your_instrumentation_key_here>
```
* Run tests
```
node Tests\TestServer.js
```
> **Note**: the startup file can also be changed to TestServer.js in the *.njsproj so that the IDE runs tests instead of the example server.
```xml
    <StartupFile>Tests\TestServer.js</StartupFile>
    <!-- <StartupFile>ExampleUsage.js</StartupFile> -->
```



## How to integrate with Azure ##
1. Click on your website tile and scroll down to the Console tile. Type the command (as shown above) to install the module from the Node Package Manager. <br/> <img src="https://cloud.githubusercontent.com/assets/8000269/3898723/334d80b8-2270-11e4-9265-fea64fa8c4d9.png" width="600">

2. Scroll to the bottom of your website blade to the Extensions tile. Click the Add button and select Visual Studio Online and add the extension. You may need to refresh the current blade for it to appear on your list of extensions. <br/> <img src="https://cloud.githubusercontent.com/assets/8000269/3898727/335acae8-2270-11e4-9294-a53f68e2bb77.png" width="600">
 
3. Next, scroll to the top and in the Summary tile, click on the section that says Application Insights. Find your Node website in the list and click on it. Then click on the Properties tile and copy your instrumentation key. <br/> <img src="https://cloud.githubusercontent.com/assets/8000269/3898721/334b228c-2270-11e4-82a7-1bb158c3a843.png" width="600"> <br/> <img src="https://cloud.githubusercontent.com/assets/8000269/3898722/334c0e04-2270-11e4-81c9-2f6101ae12a9.png" width="600"> 

4. From the website blade click "site settings". Under the "App settings" section, enter a new key "APPINSIGHTS\_INSTRUMENTATION\_KEY" and paste your instrumentation key into the value field.

5. Go back to your Extensions tile and click on Visual Studio Online to open up the VSO blade. Click the Browse button to open VSO to edit your files. <br/> <img src="https://cloud.githubusercontent.com/assets/8000269/3898729/3361b43e-2270-11e4-9c07-0904f632e514.png" width="600">

6. Once you open VSO, click on the `server.js` file and enter the require statement as stated above. <br/> <img src="https://cloud.githubusercontent.com/assets/8000269/3898728/335aea0a-2270-11e4-9545-27e5d0baac57.png" width="600"> 

7. Open your website and click on a link to generate a request. <br/>

8. Return to your project tile in the Azure Portal. You can view your requests in the Monitoring tile.