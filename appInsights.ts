/// <reference path="Context/UserContext.ts" />
/// <reference path="Context/SessionContext.ts" />
/// <reference path="Context/DeviceContext.ts" />
/// <reference path="Context/LocationContext.ts" />
/// <reference path="Context/ApplicationContext.ts" />
/// <reference path="Util.ts" />
/// <reference path="NodeSender.ts" />

module AppInsights {

    var http = require("http");
    var url = require("url");
    var uuid = require('node-uuid');
    var events = require('events');
    var emitter = new events.EventEmitter();
    var UserContext = require("./context/UserContext");
    var SessionContext = require("./context/SessionContext");
    var DeviceContext = require("./context/DeviceContext");
    var LocationContext = require("./context/LocationContext");
    var ApplicationContext = require("./context/ApplicationContext");
    var NodeSender = require("./NodeSender");
    var util = require('./Util');

    //import javascript sdk
    var ai = require("./ai");
    var context = ai.context;
    var TraceTelemetry = ai.TraceTelemetry, ExceptionTelemetry = ai.ExceptionTelemetry, RequestTelemetry = ai.RequestTelemetry, RequestData = ai.RequestData;


    //uninitialized methods
    var originalLog, trackTrace, trackRequest;

    //list of request types tp ignore
    var filteredRequests = [];

    //config file
    var config = require("../../ai.config");
    var iKey = ai.iKey;

    //set up request monitoring and logging
    function setup() {
        wrapCreateServer();
        wrapLog();
        wrapSender();
    }


    /**
    * Wrap http.createServer to automatically track requests
    */
    function wrapCreateServer() {
        var originalCreateServer = http.createServer;

        http.createServer = (onRequest) => {

            var lambda = (request, response) => {
                if (filterRequest(request)) {
                    trackRequest(request, response);
                }
                onRequest(request, response);
            }
        return originalCreateServer(lambda);
        }
    }

    /**
    * Wrap console.log to automatically track logging
    */
    function wrapLog() {
        originalLog = console.log;
        console.log = (message: string) => {
            trackTrace(message);
            originalLog(message);
        }
    }

    /**
    * Wrap Javascript SDK sender to send data via HTTP requests
    */
    function wrapSender() {
        context.sender.sender = (payload: string) => {
            NodeSender.sender(payload, context.sender.config);
        };
    }

    /**
    * Called by console.log; creates TraceTelemetry object and initializes context
    */
    trackTrace = (message: string) => {

        var traceTelemetryObject = new TraceTelemetry(message);
        //device
        traceTelemetryObject.device = new DeviceContext(null);
        //application
        traceTelemetryObject.application = new ApplicationContext(config);

        context.track(traceTelemetryObject);
    }

    /**
    * Called when request is received; creates RequestTelemetry and initializes context
    */
    trackRequest = (request, response) => {

        if (!request) {
            return;
        }

        var requestTelemetryObject = new RequestTelemetry();
        var startTime = new Date();

        //response listeners
        emitter.once('finish', trackResponse);
        response.once('finish', () => { emitter.emit('finish', requestTelemetryObject, response, startTime); });

        //call trackException if request throws error
        request.on('error', () => {
            trackException(startTime, new Date(), request, response);
        });

        //device
        requestTelemetryObject.device = new DeviceContext(request);

        //application
        requestTelemetryObject.application = new ApplicationContext(config);

        //user
        requestTelemetryObject.user = new UserContext(request, response);

        //session
        requestTelemetryObject.session = new SessionContext(request, response);

        //location
        requestTelemetryObject.location = new LocationContext(request);
        
        //data
        var item = new RequestData();
        var startTimeStamp = util.localDate(startTime);
        var pathname = url.parse(request.url).pathname;
        item.id = uuid.v4();
        item.name = request.method + " " + pathname;
        item.startTime = startTimeStamp;
        item.properties = {};
        item.properties.rawURL = request.url.toString();
        requestTelemetryObject.data.item = item;
    }

    /**
    * Called when response finishes; initializes remaining context on the RequestTelemetry object
    */
    function trackResponse(requestTelemetry, response, startTime) {
        
        if (!response) {
            return;
        }

        var endTime = new Date();
        var item = <any>requestTelemetry.data.item;
        item.duration = util.getDuration(startTime.getTime(), endTime.getTime());
        item.responseCode = response.statusCode;
        item.success = (response.statusCode < 400);
        requestTelemetry.time = util.localDate(new Date());
        context.track(requestTelemetry);
    }

    /**
    * Called when request throws an error; creates ExceptionTelemetry object and initalizes context
    */
    function trackException(startTime, errorTime, request, response) {
        var err = new Error;
        var measurements = {
            "FailedAfter[ms]": errorTime - startTime
        };
        var exceptionTelemetryObject = new ExceptionTelemetry([err]);
        exceptionTelemetryObject.data.item.measurements = measurements;

        exceptionTelemetryObject.device = new DeviceContext(request);
        exceptionTelemetryObject.application = new ApplicationContext(config);
        exceptionTelemetryObject.user = new UserContext(request);
        exceptionTelemetryObject.session = new SessionContext(request, response);
        exceptionTelemetryObject.location = new LocationContext(request, response);
        context.track(exceptionTelemetryObject);
    }

    /**
    * filters requests specified in the filteredRequests array
    */
    function filterRequest(request) {
        var path = "" + url.parse(request.url).pathname;
        for (var i = 0; i < filteredRequests.length; i++) {
            var x = "" + filteredRequests[i];
            if (path.indexOf(x) > -1) {
                return false;
            }
        }
        return true;
    }

    setup();
    module.exports = {
        trackRequest: (request, response) => {
            trackRequest(request, response);
        },
        filter: (types) => {
            filteredRequests = filteredRequests.concat(types);
        },
        trackException: (error: Error) => {
            context.track(new ExceptionTelemetry([error]));
        }
    }
}
