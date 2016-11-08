export module Contracts {
    export enum DataPointType
    {
        Measurement = 0,
        Aggregation = 1,
    }

    export enum DependencyKind
    {
        SQL = 0,
        Http = 1,
        Other = 2,
    }

    export enum DependencySourceType
    {
        Undefined = 0,
        Aic = 1,
        Apmc = 2,
    }

    export enum SessionState
    {
        Start = 0,
        End = 1,
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
        public applicationBuild:string;
        public deviceId:string;
        public deviceIp:string;
        public deviceLanguage:string;
        public deviceLocale:string;
        public deviceModel:string;
        public deviceNetwork:string;
        public deviceOEMName:string;
        public deviceOS:string;
        public deviceOSVersion:string;
        public deviceRoleInstance:string;
        public deviceRoleName:string;
        public deviceScreenResolution:string;
        public deviceType:string;
        public deviceMachineName:string;
        public locationIp:string;
        public operationId:string;
        public operationName:string;
        public operationParentId:string;
        public operationRootId:string;
        public operationSyntheticSource:string;
        public operationIsSynthetic:string;
        public sessionId:string;
        public sessionIsFirst:string;
        public sessionIsNew:string;
        public userAccountAcquisitionDate:string;
        public userAccountId:string;
        public userAgent:string;
        public userId:string;
        public userStoreRegion:string;
        public sampleRate:string;
        public internalSdkVersion:string;
        public internalAgentVersion:string;

        constructor() {
            this.applicationVersion = "ai.application.ver";
            this.applicationBuild = "ai.application.build";
            this.deviceId = "ai.device.id";
            this.deviceIp = "ai.device.ip";
            this.deviceLanguage = "ai.device.language";
            this.deviceLocale = "ai.device.locale";
            this.deviceModel = "ai.device.model";
            this.deviceNetwork = "ai.device.network";
            this.deviceOEMName = "ai.device.oemName";
            this.deviceOS = "ai.device.os";
            this.deviceOSVersion = "ai.device.osVersion";
            this.deviceRoleInstance = "ai.cloud.roleInstance";
            this.deviceRoleName = "ai.cloud.role";
            this.deviceScreenResolution = "ai.device.screenResolution";
            this.deviceType = "ai.device.type";
            this.deviceMachineName = "ai.device.machineName";
            this.locationIp = "ai.location.ip";
            this.operationId = "ai.operation.id";
            this.operationName = "ai.operation.name";
            this.operationParentId = "ai.operation.parentId";
            this.operationRootId = "ai.operation.rootId";
            this.operationSyntheticSource = "ai.operation.syntheticSource";
            this.operationIsSynthetic = "ai.operation.isSynthetic";
            this.sessionId = "ai.session.id";
            this.sessionIsFirst = "ai.session.isFirst";
            this.sessionIsNew = "ai.session.isNew";
            this.userAccountAcquisitionDate = "ai.user.accountAcquisitionDate";
            this.userAccountId = "ai.user.accountId";
            this.userAgent = "ai.user.userAgent";
            this.userId = "ai.user.id";
            this.userStoreRegion = "ai.user.storeRegion";
            this.sampleRate = "ai.sample.sampleRate";
            this.internalSdkVersion = "ai.internal.sdkVersion";
            this.internalAgentVersion = "ai.internal.agentVersion";
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
        public flags:number;
        public deviceId:string;
        public os:string;
        public osVer:string;
        public appId:string;
        public appVer:string;
        public userId:string;
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
        public handledAt:string;
        public exceptions:ExceptionDetails[];
        public severityLevel:Contracts.SeverityLevel;
        public problemId:string;
        public crashThreadId:number;
        public properties:any;
        public measurements:any;

        constructor() {
            super();
            this.ver = 2;
            this.exceptions = [];
            this.properties = {};
            this.measurements = {};

            super();
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

            super();
        }
    }

    export class RemoteDependencyTypes {
        public static ApplicationInsights = "Application Insights";
        public static Http = "Http";
        public static Sql = "SQL";
    }

    export class RemoteDependencyData extends Contracts.Domain {
        public ver:number;
        public name:string;
        public kind:Contracts.DataPointType;
        public value:number;
        public count:number;
        public min:number;
        public max:number;
        public stdDev:number;
        public dependencyKind:Contracts.DependencyKind;
        public success:boolean;
        public async:boolean;
        public dependencySource:Contracts.DependencySourceType;
        public commandName:string;
        public dependencyTypeName:string;
        public properties:any;
        public target:string;

        constructor() {
            super();
            this.ver = 2;
            this.kind = Contracts.DataPointType.Measurement;
            this.dependencyKind = Contracts.DependencyKind.Other;
            this.success = true;
            this.dependencySource = Contracts.DependencySourceType.Undefined;
            this.properties = {};

            super();
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
        public name:string;
        public startTime:string;
        public duration:string;
        public responseCode:string;
        public success:boolean;
        public httpMethod:string;
        public url:string;
        public properties:any;
        public measurements:any;
        public source:string;

        constructor() {
            super();
            this.ver = 2;
            this.properties = {};
            this.measurements = {};

            super();
        }
    }


    export class SessionStateData extends Contracts.Domain {
        public ver:number;
        public state:Contracts.SessionState;

        constructor() {
            super();
            this.ver = 2;
            this.state = Contracts.SessionState.Start;

            super();
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

