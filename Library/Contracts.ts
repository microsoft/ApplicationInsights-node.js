// this file is manually constructed and many types and fields here are deprecated.
// Need to switch to use Declarations\Constracts\Generated instead
// This will be consistent with JavaScript SDK

export module Contracts {
    export enum DataPointType
    {
        Measurement = 0,
        Aggregation = 1,
    }

    export enum SeverityLevel
    {
        Verbose = 0,
        Information = 1,
        Warning = 2,
        Error = 3,
        Critical = 4,
    }

    export class ContextTagKeys {
        public applicationVersion:string;
        public deviceId:string;
        public deviceLocale:string;
        public deviceModel:string;
        public deviceOEMName:string;
        public deviceOSVersion:string;
        public deviceType:string;
        public locationIp:string;
        public operationId:string;
        public operationName:string;
        public operationParentId:string;
        public operationSyntheticSource:string;
        public operationCorrelationVector:string;
        public sessionId:string;
        public sessionIsFirst:string;
        public userAccountId:string;
        public userAgent:string;
        public userId:string;
        public userAuthUserId:string;
        public cloudRole:string;
        public cloudRoleInstance:string;
        public internalSdkVersion:string;
        public internalAgentVersion:string;
        public internalNodeName:string;
        
        constructor()
        {
            this.applicationVersion = "ai.application.ver";
            this.deviceId = "ai.device.id";
            this.deviceLocale = "ai.device.locale";
            this.deviceModel = "ai.device.model";
            this.deviceOEMName = "ai.device.oemName";
            this.deviceOSVersion = "ai.device.osVersion";
            this.deviceType = "ai.device.type";
            this.locationIp = "ai.location.ip";
            this.operationId = "ai.operation.id";
            this.operationName = "ai.operation.name";
            this.operationParentId = "ai.operation.parentId";
            this.operationSyntheticSource = "ai.operation.syntheticSource";
            this.operationCorrelationVector = "ai.operation.correlationVector";
            this.sessionId = "ai.session.id";
            this.sessionIsFirst = "ai.session.isFirst";
            this.userAccountId = "ai.user.accountId";
            this.userAgent = "ai.user.userAgent";
            this.userId = "ai.user.id";
            this.userAuthUserId = "ai.user.authUserId";
            this.cloudRole = "ai.cloud.role";
            this.cloudRoleInstance = "ai.cloud.roleInstance";
            this.internalSdkVersion = "ai.internal.sdkVersion";
            this.internalAgentVersion = "ai.internal.agentVersion";
            this.internalNodeName = "ai.internal.nodeName";
        }
    }

    export class Domain {
        public ver:number;
        public properties:any;

        constructor() {
        }
    }

    export class Data<TDomain extends Contracts.Domain> {
        public baseType:string;
        public baseData:TDomain;

        constructor() {
        }
    }

    export class Envelope {
        public ver:number;
        public name:string;
        public time:string;
        public sampleRate:number;
        public seq:string;
        public iKey:string;
        public tags:{ [key: string]: string; };
        public data:Data<Domain>;
        
        constructor() {
            this.ver = 1;
            // the 'name' property must be initialized before 'tags' and/or 'data'.
            this.name = "";
            // the 'time' property must be initialized before 'tags' and/or 'data'.
            this.time = "";
            
            this.sampleRate = 100.0;
            this.tags = {};
        }
    }

    export class EventData extends Contracts.Domain {
        public ver:number;
        public name:string;
        public properties:any;
        public measurements:any;

        constructor() {
            super();
            this.ver = 2;
            this.properties = {};
            this.measurements = {};

            super();
        }
    }

    export class MessageData extends Contracts.Domain {
        public ver:number;
        public message:string;
        public severityLevel:Contracts.SeverityLevel;
        public properties:any;

        constructor() {
            super();
            this.ver = 2;
            this.properties = {};

            super();
        }
    }

    export class ExceptionData extends Contracts.Domain {
        public ver:number;
        public exceptions:ExceptionDetails[];
        public severityLevel:Contracts.SeverityLevel;
        public problemId:string;
        public properties:any;
        public measurements:any;
        
        constructor() {
            super();
            this.ver = 2;
            this.exceptions = [];
            this.properties = {};
            this.measurements = {};
        }
    }

    export class StackFrame {
        public level:number;
        public method:string;
        public assembly:string;
        public fileName:string;
        public line:number;

        constructor() {
        }
    }

    export class ExceptionDetails {
        public id:number;
        public outerId:number;
        public typeName:string;
        public message:string;
        public hasFullStack:boolean;
        public stack:string;
        public parsedStack:StackFrame[];

        constructor() {
            this.hasFullStack = true;
            this.parsedStack = [];
        }
    }

    export class DataPoint {
        public name:string;
        public kind:Contracts.DataPointType;
        public value:number;
        public count:number;
        public min:number;
        public max:number;
        public stdDev:number;
        
        constructor() {
            this.kind = Contracts.DataPointType.Measurement;
        }
    }

    export class MetricData extends Contracts.Domain {
        public ver:number;
        public metrics:DataPoint[];
        public properties:any;

        constructor() {
            super();
            this.ver = 2;
            this.metrics = [];
            this.properties = {};

            super();
        }
    }

    export class PageViewData extends Contracts.EventData {
        public ver:number;
        public url:string;
        public name:string;
        public duration:string;
        public properties:any;
        public measurements:any;

        constructor() {
            super();
            this.ver = 2;
            this.properties = {};
            this.measurements = {};

            super();
        }
    }

    export class PageViewPerfData extends Contracts.PageViewData {
        public ver:number;
        public url:string;
        public perfTotal:string;
        public name:string;
        public duration:string;
        public networkConnect:string;
        public sentRequest:string;
        public receivedResponse:string;
        public domProcessing:string;
        public properties:any;
        public measurements:any;

        constructor() {
            super();
            this.ver = 2;
            this.properties = {};
            this.measurements = {};
        }
    }

    export class RemoteDependencyDataConstants {
        public static TYPE_HTTP:string = "Http";
    }

    export class RemoteDependencyData extends Contracts.Domain {
        public ver:number;
        public name:string;
        public id:string;
        public resultCode:string;
        public duration:string;
        public success:boolean;
        public data:string;
        public target:string;
        public type:string;
        public properties:any;
        public measurements:any;
        
        constructor() {
            super();
            this.ver = 2;
            this.success = true;
            this.properties = {};
            this.measurements = {};
        }
    }

    export class AjaxCallData extends Contracts.PageViewData {
        public ver:number;
        public url:string;
        public ajaxUrl:string;
        public name:string;
        public duration:string;
        public requestSize:number;
        public responseSize:number;
        public timeToFirstByte:string;
        public timeToLastByte:string;
        public callbackDuration:string;
        public responseCode:string;
        public success:boolean;
        public properties:any;
        public measurements:any;

        constructor() {
            super();
            this.ver = 2;
            this.properties = {};
            this.measurements = {};

            super();
        }
    }

    export class RequestData extends Contracts.Domain {
        public ver:number;
        public id:string;
        public source:string;
        public name:string;
        public duration:string;
        public responseCode:string;
        public success:boolean;
        public url:string;
        public properties:any;
        public measurements:any;
        
        constructor() {
            super();
            this.ver = 2;
            this.properties = {};
            this.measurements = {};
        }
    }

    export class PerformanceCounterData extends Contracts.Domain {
        public ver:number;
        public categoryName:string;
        public counterName:string;
        public instanceName:string;
        public kind:DataPointType;
        public count:number;
        public min:number;
        public max:number;
        public stdDev:number;
        public value:number;
        public properties:any;

        constructor() {
            super();
            this.ver = 2;
            this.kind = DataPointType.Aggregation;
            this.properties = {};

            super();
        }
    }
}

