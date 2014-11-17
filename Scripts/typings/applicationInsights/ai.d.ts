declare module Microsoft.ApplicationInsights {
    class _InternalLogging {
        /**
        * When this is true the SDK will throw exceptions to aid in debugging.
        */
        static enableDebugExceptions: () => boolean;
        /**
        * This method will throw exceptions in debug mode or attempt to log the error as a console warning.
        */
        static throwInternal(message: string): void;
        /**
        * This method will write console warnings in debug mode
        */
        static warnInternal(message: string): void;
        /**
        * This will write a warning to the console
        */
        private static _warn(message);
    }
}
declare module Microsoft.ApplicationInsights {
    class Util {
        private static document;
        /**
        * helper method to set userId and sessionId cookie
        */
        static setCookie(name: any, value: any): void;
        /**
        * helper method to access userId and sessionId cookie
        */
        static getCookie(name: any): string;
        /**
        * helper method to trim strings (IE8 does not implement String.prototype.trim)
        */
        static trim(str: string): string;
        /**
        * generate GUID
        */
        static newGuid(): string;
        /**
        * Check if an object is of type Array
        */
        static isArray(obj: any): boolean;
        /**
        * Check if an object is of type Error
        */
        static isError(obj: any): boolean;
        /**
        * Convert a date to I.S.O. format in IE8
        */
        static toISOStringForIE8(date: Date): string;
        /**
        * Convert ms to c# time span format
        */
        static msToTimeSpan(totalms: number): string;
    }
}
declare module Microsoft.ApplicationInsights {
    interface ISerializable {
        /**
        * The set of fields for a serializeable object.
        * This defines the serialization order and a value of true/false
        * for each field defines whether the field is required or not.
        */
        aiDataContract: any;
    }
    class Serializer {
        /**
        * Serializes the current object to a JSON string.
        */
        static serialize(input: ISerializable): string;
        private static _serializeObject(source, name);
        private static _serializeArray(sources, name);
        private static _serializeStringMap(map, expectedType, name);
    }
}
declare module Microsoft.ApplicationInsights.Telemetry.Common {
    class Item implements ISerializable {
        /**
        * The data item for this telemetry.
        */
        public ver: number;
        /**
        * User defined measurements
        */
        public measurements: any;
        /**
        * User defined properties
        */
        public properties: any;
        /**
        * The data contract for serializing this object.
        */
        public aiDataContract: any;
        /**
        * Constructs a new instance of telemetry data.
        */
        constructor(contractExtension: Object, properties?: Object, measurements?: Object);
        static extendContract(contract: any, contractExtension: any): any;
    }
}
declare module Microsoft.ApplicationInsights.Telemetry.Common {
    class Data {
        /**
        * The type of this telemetry.
        */
        public name: string;
        /**
        * The data item for this telemetry.
        */
        public item: Item;
        /**
        * The data contract for serializing this object.
        */
        public aiDataContract: {
            name: boolean;
            item: boolean;
        };
        /**
        * Constructs a new instance of telemetry data.
        */
        constructor(name: string, item: Item);
    }
}
declare module Microsoft.ApplicationInsights.Telemetry.Common {
    class Internal {
        /**
        * The SDK version used to create this telemetry item.
        */
        public sdkVersion: string;
        /**
        * The data contract for serializing this object.
        */
        public aiDataContract: {
            sdkVersion: boolean;
        };
        /**
        * Constructs a new instance of the internal telemetry data class.
        */
        constructor();
    }
}
declare module Microsoft.ApplicationInsights.Context {
    class Application implements ISerializable {
        /**
        * The application version.
        */
        public ver: string;
        /**
        * component id
        */
        public id: string;
        /**
        * See ISerializable
        */
        public aiDataContract: {};
        /**
        * Constructs a new isntance of the Application class
        */
        constructor(appUserId: string);
    }
}
declare module Microsoft.ApplicationInsights.Context {
    class Device {
        /**
        * The type for the current device.
        */
        public type: string;
        /**
        * A device unique ID.
        */
        public id: string;
        /**
        * The operating system name and version.
        */
        public os: string;
        /**
        * The operating system name and version.
        */
        public osVersion: string;
        /**
        * The device OEM for the current device.
        */
        public oemName: string;
        /**
        * The device model for the current device.
        */
        public model: string;
        /**
        * The IANA interface type for the internet connected network adapter.
        */
        public network: number;
        /**
        * The application screen resolution.
        */
        public resolution: string;
        /**
        * The current display language of the operating system.
        */
        public locale: string;
        /**
        * See ISerializable
        */
        public aiDataContract: {
            type: boolean;
            id: boolean;
            os: boolean;
            osVersion: boolean;
            oemName: boolean;
            model: boolean;
            network: boolean;
            resolution: boolean;
            locale: boolean;
        };
        /**
        * Constructs a new instance of the Device class
        */
        constructor();
        public getOsInfo(appVersion: string): void;
    }
}
declare module Microsoft.ApplicationInsights.Context {
    class Location implements ISerializable {
        /**
        * GPS latitude
        */
        public latitude: string;
        /**
        * GPS longitude
        */
        public longitude: string;
        /**
        * Client IP address for reverse lookup
        */
        public IP: string;
        /**
        * Developer override for Region geo location
        */
        public continent: string;
        /**
        * Developer override for Country geo location
        */
        public country: string;
        /**
        * Developer override for Province geo location
        */
        public province: string;
        /**
        * Developer override for City geo location
        */
        public city: string;
        /**
        * See ISerializable
        */
        public aiDataContract: {};
        constructor();
    }
}
declare module Microsoft.ApplicationInsights.Context {
    class Operation implements ISerializable {
        /**
        * The operation ID.
        */
        public id: string;
        /**
        * See ISerializable
        */
        public aiDataContract: {};
        constructor();
    }
}
declare module Microsoft.ApplicationInsights.Context {
    interface ISessionConfig {
        sessionRenewalMs: () => number;
        sessionExpirationMs: () => number;
    }
    class Session {
        static acquisitionSpan: number;
        static renewalSpan: number;
        /**
        * The session ID.
        */
        public id: string;
        /**
        * The true if this is the first session
        */
        public isFirst: boolean;
        /**
        * The true if this is a new session
        */
        public isNewSession: boolean;
        /**
        * See ISerializable
        */
        public aiDataContract: {};
        /**
        * The date at which this guid was genereated.
        * Per the spec the ID will be regenerated if more than acquisitionSpan milliseconds ellapse from this time.
        */
        public acquisitionDate: number;
        /**
        * The date at which this session ID was last reported.
        * This value should be updated whenever telemetry is sent using this ID.
        * Per the spec the ID will be regenerated if more than renewalSpan milliseconds elapse from this time with no activity.
        */
        public renewalDate: number;
        /**
        * The configuration for session behavior
        */
        public config: ISessionConfig;
        /**
        * Constructs a new isntance of the Session class
        */
        constructor(config?: ISessionConfig);
        public update(): void;
        private renew();
        private setCookie(guid, acq, renewal);
    }
}
declare module Microsoft.ApplicationInsights.Context {
    class User implements ISerializable {
        /**
        * The user ID.
        */
        public id: string;
        /**
        * The user ID.
        */
        public accountId: string;
        /**
        * See ISerializable
        */
        public aiDataContract: {};
        constructor(accountId: string);
    }
}
declare module Microsoft.ApplicationInsights.Telemetry.Common {
    class Base {
        /**
        * The version number for this telemetry request.
        */
        public ver: number;
        /**
        * The type of this telemetry.
        */
        public name: string;
        /**
        * The time stamp for this telemetry.
        */
        public time: string;
        /**
        * The instrumentation key associated with this telemetry object.
        */
        public iKey: string;
        /**
        * The object describing a component tracked by this object.
        */
        public application: Context.Application;
        /**
        * The object describing a device tracked by this object.
        */
        public device: Context.Device;
        /**
        * The object describing a user tracked by this object.
        */
        public user: Context.User;
        /**
        * The object describing a session tracked by this object.
        */
        public session: Context.Session;
        /**
        * The object describing a location tracked by this object.
        */
        public location: Context.Location;
        /**
        * The object describing a operation tracked by this object.
        */
        public operation: Context.Operation;
        /**
        * The serializable data associated with this object.
        */
        public data: Data;
        /**
        * The internal data for this item.
        */
        public internal: Internal;
        /**
        * The data contract for serializing this object.
        */
        public aiDataContract: any;
        /**
        * Constructs a new instance of a telemetry object.
        */
        constructor(name: string, data: Data);
    }
}
declare module Microsoft.ApplicationInsights {
    interface ISenderConfig {
        /**
        * The url to which payloads will be sent
        */
        endpointUrl: () => string;
        /**
        * The number of bytes which can be queued before calling batchInvoke or throttling
        */
        maxPayloadSizeInBytes: () => number;
        /**
        * The interval in milliseconds between scheduled calls to batchInvoke
        */
        bufferMaxInterval: () => number;
        /**
        * The minimum interval allowed between calls to batchInvoke
        */
        bufferMinInterval: () => number;
        /**
        * The master off switch.  Do not send any data if set to TRUE
        */
        disableTelemetry: () => boolean;
    }
    class Sender {
        private _buffer;
        private _lastSend;
        private _timeoutHandle;
        /**
        * The configuration for this sender instance
        */
        public _config: ISenderConfig;
        /**
        * A method which will cause data to be send to the url
        */
        public _sender: (payload: string) => void;
        /**
        * Constructs a new instance of the Sender class
        */
        constructor(config: ISenderConfig);
        /**
        * Add a telemetry item to the send buffer
        */
        public send(telemetry: Telemetry.Common.Base): void;
        private _getSizeInBytes(list);
        public _truncate(telemetry: Telemetry.Common.Base, initialSize: number): Telemetry.Common.Base;
        /**
        * Immediately sennd buffered data
        */
        public triggerSend(): void;
        /**
        * Send XMLHttpRequest
        */
        private _xhrSender(payload);
        /**
        * Send XDomainRequest
        */
        private _xdrSender(payload);
        /**
        * xhr state changes
        */
        static _xhrReadyStateChange(xhr: XMLHttpRequest, payload: string): void;
        /**
        * xdr state changes
        */
        static _xdrOnLoad(xdr: XDomainRequest, payload: string): void;
        /**
        * error handler
        */
        static _onError(payload: string, message: string, event?: ErrorEvent): void;
        /**
        * success handler
        */
        static _onSuccess(payload: string): void;
    }
}
declare module Microsoft.ApplicationInsights.Telemetry {
    class Trace extends Common.Base implements ISerializable {
        static type: string;
        /**
        * Constructs a new instance of the MetricTelemetry object
        */
        constructor(message: string, properties?: Object, measurements?: Object);
    }
}
declare module Microsoft.ApplicationInsights.Telemetry.Common {
    /**
    * Base class for telemetry of an event
    * this is used by Event, PageView, and AJAX
    */
    class EventData extends Item {
        public name: string;
        public url: string;
        public duration: string;
        constructor(name: string, url: string, durationMs: number, properties: any, measurements: any);
    }
}
declare module Microsoft.ApplicationInsights.Telemetry {
    class AjaxCall extends Common.Base implements ISerializable {
        static type: string;
        /**
        * Constructs a new instance of the AjaxCallTelemetry object
        */
        constructor();
    }
}
declare module Microsoft.ApplicationInsights.Telemetry {
    class Event extends Common.Base implements ISerializable {
        static type: string;
        /**
        * Constructs a new instance of the EventTelemetry object
        */
        constructor(name: string, durationMs?: number, properties?: Object, measurements?: Object);
    }
}
declare module Microsoft.ApplicationInsights.Telemetry {
    class Exception extends Common.Base implements ISerializable {
        static type: string;
        /**
        * Constructs a new isntance of the ExceptionTelemetry object
        */
        constructor(exceptions: Error, handledAt?: string, properties?: Object, measurements?: Object);
    }
}
declare module Microsoft.ApplicationInsights.Telemetry {
    class Metric extends Common.Base implements ISerializable {
        static type: string;
        /**
        * Constructs a new instance of the MetricTelemetry object
        */
        constructor(name: string, value: number, type?: string, count?: number, min?: number, max?: number, properties?: Object, measurements?: Object);
    }
}
declare module Microsoft.ApplicationInsights.Telemetry {
    class PageView extends Common.Base implements ISerializable {
        static type: string;
        /**
        * Constructs a new instance of the PageEventTelemetry object
        */
        constructor(name?: string, url?: string, durationMs?: number, properties?: any, measurements?: any);
    }
}
declare module Microsoft.ApplicationInsights.Telemetry {
    class PageViewPerformance extends Common.Base implements ISerializable {
        static type: string;
        /**
        * Constructs a new instance of the PageEventTelemetry object
        */
        constructor(name: string, url: string, durationMs: number, properties?: any, measurements?: any);
        /**
        * Returns undefined if not available, true if ready, false otherwise
        */
        static checkPageLoad(): any;
        static getDuration(start: any, end: any): number;
    }
}
declare module Microsoft.ApplicationInsights.Telemetry.Common {
    /**
    * Base class for telemetry with data
    * this is used by Metric and RemoteDependency
    */
    class DataPoint {
        public name: string;
        public value: number;
        /**
        * The type of this measurement. "M" indicates a single point, "A" indicates an aggregate
        */
        public type: string;
        public count: number;
        public min: number;
        public max: number;
        public stdDev: number;
        constructor(name: string, value: number, type?: string, count?: number, min?: number, max?: number);
        public aiDataContract: {
            name: boolean;
            value: boolean;
            type: boolean;
            count: boolean;
            min: boolean;
            max: boolean;
        };
    }
}
declare module Microsoft.ApplicationInsights.Telemetry {
    class RemoteDependency extends Common.Base implements ISerializable {
        static type: string;
        /**
        * Constructs a new instance of the EventTelemetry object
        */
        constructor(dependencyKind: number, resource: string, name: string, value: number, type?: string, count?: number, min?: number, max?: number);
    }
}
declare module Microsoft.ApplicationInsights.Telemetry {
    class Request extends Common.Base implements ISerializable {
        static type: string;
        /**
        * Constructs a new instance of the EventTelemetry object
        */
        constructor(name: string, start: number, duration: number, responseCode: number, success: boolean, properties?: any, measurements?: any);
    }
}
declare module Microsoft.ApplicationInsights {
    interface ITelemetryConfig extends ISenderConfig {
        instrumentationKey: () => string;
        accountId: () => string;
        appUserId: () => string;
        sessionRenewalMs: () => number;
        sessionExpirationMs: () => number;
    }
    class TelemetryContext {
        /**
        * The configuration for this telemetry context
        */
        public _config: ITelemetryConfig;
        /**
        * The sender instance for this context
        */
        public _sender: Sender;
        /**
        * The object describing a component tracked by this object.
        */
        public application: Context.Application;
        /**
        * The object describing a device tracked by this object.
        */
        public device: Context.Device;
        /**
        * The object describing a user tracked by this object.
        */
        public user: Context.User;
        /**
        * The object describing a session tracked by this object.
        */
        public session: Context.Session;
        /**
        * The object describing a location tracked by this object.
        */
        public location: Context.Location;
        /**
        * The object describing a operation tracked by this object.
        */
        public operation: Context.Operation;
        constructor(config: ITelemetryConfig);
        /**
        * Use Sender.ts to send telemetry object to the endpoint
        */
        public track(telemetryObject: Telemetry.Common.Base): Telemetry.Common.Base;
    }
}
declare module Microsoft.ApplicationInsights {
    var Version: string;
    interface IConfig {
        instrumentationKey: string;
        endpointUrl: string;
        accountId: string;
        appUserId: string;
        sessionRenewalMs: number;
        sessionExpirationMs: number;
        maxPayloadSizeInBytes: number;
        bufferMinInterval: number;
        bufferMaxInterval: number;
        enableDebug: boolean;
        autoCollectErrors: boolean;
        disableTelemetry: boolean;
    }
    class AppInsights {
        private _eventTracking;
        private _pageTracking;
        public config: IConfig;
        public context: TelemetryContext;
        constructor(config: IConfig);
        public startTrackPage(name?: string): void;
        public stopTrackPage(name?: string, url?: string, properties?: any, measurements?: any): void;
        public trackPageView(name?: string, url?: string, properties?: any, measurements?: any): void;
        public startTrackEvent(name: string): void;
        public stopTrackEvent(name: string, properties?: Object, measurements?: Object): void;
        public trackEvent(name: string, properties?: Object, measurements?: Object): void;
        public trackException(exception: Error, handledAt?: string, properties?: Object, measurements?: Object): void;
        public trackMetric(name: string, value: number, properties?: Object, measurements?: Object): void;
        public trackTrace(message: string, properties?: Object, measurements?: Object): void;
        public _onerror(message: string, url: string, lineNumber: number, columnNumber: number, error: Error): void;
    }
}
declare module Microsoft.ApplicationInsights {
    interface Snippet {
        queue: {
            (): void;
        }[];
        config: IConfig;
    }
    class Initialization {
        public snippet: Snippet;
        public config: IConfig;
        constructor(snippet: Snippet);
        public loadAppInsights(): AppInsights;
        public emptyQueue(): void;
    }
}
