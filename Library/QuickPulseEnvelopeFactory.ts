import os = require("os");
import Contracts = require("../Declarations/Contracts")
import Util = require("./Util")
import Config = require("./Config");
import Context = require("./Context");

var StreamId = Util.w3cTraceId(); // Create a guid

class QuickPulseEnvelopeFactory {
    private static keys = new Contracts.ContextTagKeys();

    public static createQuickPulseEnvelope(metrics: Contracts.MetricQuickPulse[], documents: Contracts.DocumentQuickPulse[], config: Config, context: Context): Contracts.EnvelopeQuickPulse {
        const machineName = (os && typeof os.hostname === "function"
            && os.hostname()) || "Unknown"; // Note: os.hostname() was added in node v0.3.3
        const instance = (context.tags
            && context.keys
            && context.keys.cloudRoleInstance
            && context.tags[context.keys.cloudRoleInstance]) || machineName;

        var envelope: Contracts.EnvelopeQuickPulse = {
            Documents: documents.length > 0 ? documents : null,
            InstrumentationKey: config.instrumentationKey || "",
            Metrics: metrics.length > 0 ? metrics : null,
            InvariantVersion: 1, //  1 -> v1 QPS protocol
            Timestamp: `\/Date(${Date.now()})\/`,
            Version: context.tags[context.keys.internalSdkVersion],
            StreamId: StreamId,
            MachineName: machineName,
            Instance: instance
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
            case "ExceptionData":
                return QuickPulseEnvelopeFactory.createQuickPulseExceptionDocument(envelope);
            case "MessageData":
                return QuickPulseEnvelopeFactory.createQuickPulseTraceDocument(envelope);
            case "RemoteDependencyData":
                return QuickPulseEnvelopeFactory.createQuickPulseDependencyDocument(envelope);
            case "RequestData":
                return QuickPulseEnvelopeFactory.createQuickPulseRequestDocument(envelope);
        }
        return null;
    }

    private static createQuickPulseTraceDocument(envelope: Contracts.Envelope): Contracts.MessageDocumentQuickPulse {
        const document = QuickPulseEnvelopeFactory.createQuickPulseDocument(envelope);
        const severityLevel = ((envelope.data as any).baseData as Contracts.MessageData).severityLevel || 0;
        var traceDocument: Contracts.MessageDocumentQuickPulse = {
            ...document,
            Message: ((envelope.data as any).baseData as Contracts.MessageData).message,
            SeverityLevel: Contracts.SeverityLevel[severityLevel]
        }

        return traceDocument;
    }

    private static createQuickPulseExceptionDocument(envelope: Contracts.Envelope): Contracts.ExceptionDocumentQuickPulse {
        const document = QuickPulseEnvelopeFactory.createQuickPulseDocument(envelope);
        const exceptionDetails = ((envelope.data as any).baseData as Contracts.ExceptionData).exceptions;

        let exception = '';
        let exceptionMessage = '';
        let exceptionType = '';

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
            DependencyTypeName: baseData.type,
        }
        return dependencyDocument;
    }

    private static createQuickPulseDocument(envelope: Contracts.Envelope): Contracts.DocumentQuickPulse {
        let documentType, __type, operationId, properties;


        switch (envelope.data.baseType) {
            case "EventData":
                documentType = "Event"
                break;
            case "ExceptionData":
                documentType = "Exception";
                break;
            case "MessageData":
                documentType = "Trace";
                break;
            case "MetricData":
                documentType = "Metric";
                break;
            case "RequestData":
                documentType = "Request";
                break;
            case "RemoteDependencyData":
                documentType = "RemoteDependency";
                __type = "DependencyTelemetryDocument";
                break;
        }
        __type = __type || (documentType + "TelemetryDocument");
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
                const property: Contracts.IDocumentProperty = {key, value};
                properties.push(property);
            }
        }

        // Collect properties
        const props = ((envelope.data as any).baseData).properties || {};
        for (let key in props) {
            if (props.hasOwnProperty(key)) {
                const value = props[key];
                const property: Contracts.IDocumentProperty = {key, value};
                properties.push(property);
            }
        }

        return properties;
    }
}




export = QuickPulseEnvelopeFactory;