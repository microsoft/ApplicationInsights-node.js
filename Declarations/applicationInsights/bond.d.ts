declare module Bond {
    export interface ISerializable {
        /**
         * The set of fields for a serializeable object.
         * This defines the serialization order and a value of true/false
         * for each field defines whether the field is required or not.
         */
        aiDataContract: any;
    }

    export class Base {
        baseType:string;

        constructor();
    }

    export class Envelope {
        ver:number;
        name:string;
        time:string;
        sampleRate:number;
        seq:string;
        iKey:string;
        flags:number;
        deviceId:string;
        os:string;
        osVer:string;
        appId:string;
        appVer:string;
        userId:string;
        tags:any;
        data:Base;

        constructor();
    }

    export class Domain {
        ver:number;
        constructor();
    }
    export enum SeverityLevel {
        Verbose = 0,
        Information = 1,
        Warning = 2,
        Error = 3,
        Critical = 4,
    }

    export class MessageData extends Domain {
        ver:number;
        message:string;
        severityLevel:SeverityLevel;
        properties:any;

        constructor();
    }

    export class EventData extends Bond.Domain {
        ver:number;
        name:string;
        properties:any;
        measurements:any;

        constructor();
    }

    export class ExceptionDetails {
        id:number;
        outerId:number;
        typeName:string;
        message:string;
        hasFullStack:boolean;
        stack:string;
        parsedStack:StackFrame[];

        constructor();
    }

    export class ExceptionData extends Bond.Domain {
        ver:number;
        handledAt:string;
        exceptions:ExceptionDetails[];
        severityLevel:SeverityLevel;
        problemId:string;
        crashThreadId:number;
        properties:any;
        measurements:any;

        constructor();
    }

    export class StackFrame {
        level:number;
        method:string;
        assembly:string;
        fileName:string;
        line:number;

        constructor();
    }


    export class MetricData extends Bond.Domain {
        ver:number;
        metrics:DataPoint[];
        properties:any;

        constructor();
    }

    export    enum DataPointType {
        Measurement = 0,
        Aggregation = 1,
    }


    export class DataPoint {
        name:string;
        kind:DataPointType;
        value:number;
        count:number;
        min:number;
        max:number;
        stdDev:number;

        constructor();
    }

    export class PageViewData extends EventData {
        ver:number;
        url:string;
        name:string;
        duration:string;
        properties:any;
        measurements:any;

        constructor();
    }

    export class PageViewPerfData extends PageViewData {
        ver:number;
        url:string;
        perfTotal:string;
        name:string;
        duration:string;
        networkConnect:string;
        sentRequest:string;
        receivedResponse:string;
        domProcessing:string;
        properties:any;
        measurements:any;

        constructor();
    }

    export enum SessionState {
        Start = 0,
        End = 1
    }

    export class SessionStateData extends Bond.Domain {
        ver:number;
        state:SessionState;

        constructor();
    }

    export class Data<TDomain> extends Bond.Base {
        baseType:string;
        baseData:TDomain;

        constructor();
    }

    export class AjaxCallData extends PageViewData {
        ver:number;
        url:string;
        ajaxUrl:string;
        name:string;
        duration:string;
        requestSize:number;
        responseSize:number;
        timeToFirstByte:string;
        timeToLastByte:string;
        callbackDuration:string;
        responseCode:string;
        success:boolean;
        properties:any;
        measurements:any;

        constructor();
    }

    export    enum DependencyKind {
        SQL = 0,
        Http = 1,
        Other = 2,
    }

    export enum DependencySourceType {
        Undefined = 0,
        Aic = 1,
        Apmc = 2,
    }

    export class ContextTagKeys {
        applicationVersion:string;
        applicationBuild:string;
        deviceId:string;
        deviceIp:string;
        deviceLanguage:string;
        deviceLocale:string;
        deviceModel:string;
        deviceNetwork:string;
        deviceOEMName:string;
        deviceOS:string;
        deviceOSVersion:string;
        deviceRoleInstance:string;
        deviceRoleName:string;
        deviceScreenResolution:string;
        deviceType:string;
        deviceMachineName:string;
        locationIp:string;
        operationId:string;
        operationName:string;
        operationParentId:string;
        operationRootId:string;
        operationSyntheticSource:string;
        operationIsSynthetic:string;
        sessionId:string;
        sessionIsFirst:string;
        sessionIsNew:string;
        userAccountAcquisitionDate:string;
        userAccountId:string;
        userAgent:string;
        userId:string;
        userStoreRegion:string;
        sampleRate:string;
        internalSdkVersion:string;
        internalAgentVersion:string;

        constructor();
    }

    export class RemoteDependencyData extends Bond.Domain {
        ver:number;
        name:string;
        kind:DataPointType;
        value:number;
        count:number;
        min:number;
        max:number;
        stdDev:number;
        dependencyKind:DependencyKind;
        success:boolean;
        async:boolean;
        dependencySource:DependencySourceType;
        commandName:string;
        dependencyTypeName:string;
        properties:any;

        constructor();
    }

    export class RequestData extends Bond.Domain {
        ver:number;
        id:string;
        name:string;
        startTime:string;
        duration:string;
        responseCode:string;
        success:boolean;
        httpMethod:string;
        url:string;
        properties:any;
        measurements:any;

        constructor();
    }
}
