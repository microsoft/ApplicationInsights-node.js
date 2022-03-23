import * as os from "os";
import * as Contracts from "../../Declarations/Contracts";
import * as Constants from "../../Declarations/Constants";
import { KnownSeverityLevel } from "../../Declarations/Generated";
import { Util } from "../Util/Util";
import { Config } from "../Configuration/Config";
import { Context } from "../Context";
import { Logger } from "../Logging/Logger";

var StreamId = Util.getInstance().w3cTraceId(); // Create a guid

export class QuickPulseEnvelopeFactory {
    private static keys = new Contracts.ContextTagKeys();

    public static createQuickPulseEnvelope(metrics: Contracts.MetricQuickPulse[], documents: Contracts.DocumentQuickPulse[], config: Config, context: Context): Contracts.EnvelopeQuickPulse {
        const machineName = (os && typeof os.hostname === "function"
            && os.hostname()) || "Unknown"; // Note: os.hostname() was added in node v0.3.3
        const instance = (context.tags
            && context.keys
            && context.keys.cloudRoleInstance
            && context.tags[context.keys.cloudRoleInstance]) || machineName;

        const roleName = (context.tags
            && context.keys
            && context.keys.cloudRole
            && context.tags[context.keys.cloudRole]) || null;

        var envelope: Contracts.EnvelopeQuickPulse = {
            Documents: documents.length > 0 ? documents : null,
            InstrumentationKey: config.instrumentationKey || "",
            Metrics: metrics.length > 0 ? metrics : null,
            InvariantVersion: 1, //  1 -> v1 QPS protocol
            Timestamp: `\/Date(${Date.now()})\/`,
            Version: context.tags[context.keys.internalSdkVersion],
            StreamId: StreamId,
            MachineName: machineName,
            Instance: instance,
            RoleName: roleName
        }

        return envelope;
    }

    public static createQuickPulseMetric(
        telemetry: Contracts.MetricTelemetry
    ): Contracts.MetricQuickPulse {
        var data: Contracts.MetricQuickPulse;
        data = {
            Name: telemetry.name, // TODO: map from MetricTelemetry name to QuickPulse name
            Value: telemetry.value,
            Weight: telemetry.count || 1
        };
        return data;
    }

    public static telemetryEnvelopeToQuickPulseDocument(envelope: Contracts.Envelope): Contracts.DocumentQuickPulse {
        switch (envelope.data.baseType) {
            case Contracts.TelemetryTypeString.Event:
                return QuickPulseEnvelopeFactory.createQuickPulseEventDocument(envelope);
            case Contracts.TelemetryTypeString.Exception:
                return QuickPulseEnvelopeFactory.createQuickPulseExceptionDocument(envelope);
            case Contracts.TelemetryTypeString.Trace:
                return QuickPulseEnvelopeFactory.createQuickPulseTraceDocument(envelope);
            case Contracts.TelemetryTypeString.Dependency:
                return QuickPulseEnvelopeFactory.createQuickPulseDependencyDocument(envelope);
            case Contracts.TelemetryTypeString.Request:
                return QuickPulseEnvelopeFactory.createQuickPulseRequestDocument(envelope);
        }
        return null;
    }

    private static createQuickPulseEventDocument(envelope: Contracts.Envelope): Contracts.EventDocumentQuickPulse {
        const document = QuickPulseEnvelopeFactory.createQuickPulseDocument(envelope);
        const name = ((envelope.data as any).baseData as Contracts.EventData).name;
        const eventDocument: Contracts.EventDocumentQuickPulse = {
            ...document,
            Name: name
        };

        return eventDocument;
    }

    private static createQuickPulseTraceDocument(envelope: Contracts.Envelope): Contracts.MessageDocumentQuickPulse {
        const document = QuickPulseEnvelopeFactory.createQuickPulseDocument(envelope);
        const severityLevel = ((envelope.data as any).baseData as Contracts.MessageData).severityLevel || KnownSeverityLevel.Information;
        var traceDocument: Contracts.MessageDocumentQuickPulse = {
            ...document,
            Message: ((envelope.data as any).baseData as Contracts.MessageData).message,
            SeverityLevel: severityLevel
        }

        return traceDocument;
    }

    private static createQuickPulseExceptionDocument(envelope: Contracts.Envelope): Contracts.ExceptionDocumentQuickPulse {
        const document = QuickPulseEnvelopeFactory.createQuickPulseDocument(envelope);
        const exceptionDetails = ((envelope.data as any).baseData as Contracts.ExceptionData).exceptions;

        let exception = "";
        let exceptionMessage = "";
        let exceptionType = "";

        // Try to fill exception information from first error only
        if (exceptionDetails && exceptionDetails.length > 0) {
            // Try to grab the stack from parsedStack or stack
            if (exceptionDetails[0].parsedStack && exceptionDetails[0].parsedStack.length > 0) {
                exceptionDetails[0].parsedStack.forEach(err => {
                    exception += err.assembly + "\n";
                });
            } else if (exceptionDetails[0].stack && exceptionDetails[0].stack.length > 0) {
                exception = exceptionDetails[0].stack;
            }

            exceptionMessage = exceptionDetails[0].message;
            exceptionType = exceptionDetails[0].typeName;
        }

        var exceptionDocument = {
            ...document,
            Exception: exception,
            ExceptionMessage: exceptionMessage,
            ExceptionType: exceptionType
        };
        return exceptionDocument;
    }

    private static createQuickPulseRequestDocument(envelope: Contracts.Envelope): Contracts.RequestDocumentQuickPulse {
        const document = QuickPulseEnvelopeFactory.createQuickPulseDocument(envelope);
        const baseData = (envelope.data as Contracts.Data<Contracts.RequestData>).baseData;
        const requestDocument: Contracts.RequestDocumentQuickPulse = {
            ...document,
            Name: baseData.name,
            Success: baseData.success,
            Duration: baseData.duration,
            ResponseCode: baseData.responseCode,
            OperationName: baseData.name // TODO: is this correct?
        };

        return requestDocument;
    }

    private static createQuickPulseDependencyDocument(envelope: Contracts.Envelope): Contracts.DependencyDocumentQuickPulse {
        const document = QuickPulseEnvelopeFactory.createQuickPulseDocument(envelope);
        const baseData = (envelope.data as Contracts.Data<Contracts.RemoteDependencyData>).baseData;

        const dependencyDocument: Contracts.DependencyDocumentQuickPulse = {
            ...document,
            Name: baseData.name,
            Target: baseData.target,
            Success: baseData.success,
            Duration: baseData.duration,
            ResultCode: baseData.resultCode,
            CommandName: baseData.data,
            OperationName: document.OperationId,
            DependencyTypeName: baseData.type
        }
        return dependencyDocument;
    }

    private static createQuickPulseDocument(envelope: Contracts.Envelope): Contracts.DocumentQuickPulse {
        let documentType: Constants.QuickPulseDocumentType;
        let __type: Constants.QuickPulseType;
        let operationId, properties;


        if (envelope.data.baseType) {
            __type = Constants.TelemetryTypeStringToQuickPulseType[envelope.data.baseType as Contracts.TelemetryTypeValues];
            documentType = Constants.TelemetryTypeStringToQuickPulseDocumentType[envelope.data.baseType as Contracts.TelemetryTypeValues];
        } else {
            // Remark: This should never be hit because createQuickPulseDocument is only called within
            // valid baseType values
            Logger.warn("Document type invalid; not sending live metric document", envelope.data.baseType);
        }

        operationId = envelope.tags[QuickPulseEnvelopeFactory.keys.operationId];
        properties = QuickPulseEnvelopeFactory.aggregateProperties(envelope);

        var document: Contracts.DocumentQuickPulse = {
            DocumentType: documentType,
            __type: __type,
            OperationId: operationId,
            Version: "1.0",
            Properties: properties
        };

        return document;
    }

    private static aggregateProperties(envelope: Contracts.Envelope): Contracts.IDocumentProperty[] {
        const properties: Contracts.IDocumentProperty[] = [];

        // Collect measurements
        const meas = ((envelope.data as any).baseData).measurements || {};
        for (let key in meas) {
            if (meas.hasOwnProperty(key)) {
                const value = meas[key];
                const property: Contracts.IDocumentProperty = { key, value };
                properties.push(property);
            }
        }

        // Collect properties
        const props = ((envelope.data as any).baseData).properties || {};
        for (let key in props) {
            if (props.hasOwnProperty(key)) {
                const value = props[key];
                const property: Contracts.IDocumentProperty = { key, value };
                properties.push(property);
            }
        }

        return properties;
    }
}
