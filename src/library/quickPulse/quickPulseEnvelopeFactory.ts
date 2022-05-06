import * as os from "os";
import * as Contracts from "../../declarations/contracts";
import * as Constants from "../../declarations/constants";
import { KnownContextTagKeys, KnownSeverityLevel } from "../../declarations/generated";
import { Util } from "../util";
import { Config } from "../configuration";
import { Context } from "../context";
import { Logger } from "../logging";
import { TelemetryItem as Envelope } from "../../declarations/generated";

const StreamId = Util.getInstance().w3cTraceId(); // Create a guid

export class QuickPulseEnvelopeFactory {
    public createQuickPulseEnvelope(
        metrics: Contracts.MetricQuickPulse[],
        documents: Contracts.DocumentQuickPulse[],
        config: Config,
        context: Context
    ): Contracts.EnvelopeQuickPulse {
        const machineName = (os && typeof os.hostname === "function" && os.hostname()) || "Unknown"; // Note: os.hostname() was added in node v0.3.3
        const instance =
            (context.tags && context.tags[KnownContextTagKeys.AiCloudRoleInstance]) || machineName;

        const roleName = (context.tags && context.tags[KnownContextTagKeys.AiCloudRole]) || null;

        var envelope: Contracts.EnvelopeQuickPulse = {
            Documents: documents.length > 0 ? documents : null,
            InstrumentationKey: config.instrumentationKey || "",
            Metrics: metrics.length > 0 ? metrics : null,
            InvariantVersion: 1, //  1 -> v1 QPS protocol
            Timestamp: `\/Date(${Date.now()})\/`,
            Version: context.tags[KnownContextTagKeys.AiInternalSdkVersion],
            StreamId: StreamId,
            MachineName: machineName,
            Instance: instance,
            RoleName: roleName,
        };

        return envelope;
    }

    public createQuickPulseMetric(
        telemetry: Contracts.MetricPointTelemetry
    ): Contracts.MetricQuickPulse {
        var data: Contracts.MetricQuickPulse;
        data = {
            Name: telemetry.name, // TODO: map from MetricTelemetry name to QuickPulse name
            Value: telemetry.value,
            Weight: telemetry.count || 1,
        };
        return data;
    }

    public telemetryEnvelopeToQuickPulseDocument(envelope: Envelope): Contracts.DocumentQuickPulse {
        switch (envelope.data.baseType) {
            case Contracts.TelemetryTypeString.Event:
                return this._createQuickPulseEventDocument(envelope);
            case Contracts.TelemetryTypeString.Exception:
                return this._createQuickPulseExceptionDocument(envelope);
            case Contracts.TelemetryTypeString.Trace:
                return this._createQuickPulseTraceDocument(envelope);
            case Contracts.TelemetryTypeString.Dependency:
                return this._createQuickPulseDependencyDocument(envelope);
            case Contracts.TelemetryTypeString.Request:
                return this._createQuickPulseRequestDocument(envelope);
        }
        return null;
    }

    private _createQuickPulseEventDocument(envelope: Envelope): Contracts.EventDocumentQuickPulse {
        const document = this._createQuickPulseDocument(envelope);
        const name = ((envelope.data as any).baseData as any).name;
        const eventDocument: Contracts.EventDocumentQuickPulse = {
            ...document,
            Name: name,
        };

        return eventDocument;
    }

    private _createQuickPulseTraceDocument(
        envelope: Envelope
    ): Contracts.MessageDocumentQuickPulse {
        const document = this._createQuickPulseDocument(envelope);
        const severityLevel =
            ((envelope.data as any).baseData as any).severityLevel ||
            KnownSeverityLevel.Information;
        var traceDocument: Contracts.MessageDocumentQuickPulse = {
            ...document,
            Message: ((envelope.data as any).baseData as any).message,
            SeverityLevel: severityLevel,
        };

        return traceDocument;
    }

    private _createQuickPulseExceptionDocument(
        envelope: Envelope
    ): Contracts.ExceptionDocumentQuickPulse {
        const document = this._createQuickPulseDocument(envelope);
        const exceptionDetails = ((envelope.data as any).baseData as any).exceptions;

        let exception = "";
        let exceptionMessage = "";
        let exceptionType = "";

        // Try to fill exception information from first error only
        if (exceptionDetails && exceptionDetails.length > 0) {
            // Try to grab the stack from parsedStack or stack
            if (exceptionDetails[0].parsedStack && exceptionDetails[0].parsedStack.length > 0) {
                exceptionDetails[0].parsedStack.forEach((err: { assembly: string }) => {
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
            ExceptionType: exceptionType,
        };
        return exceptionDocument;
    }

    private _createQuickPulseRequestDocument(
        envelope: Envelope
    ): Contracts.RequestDocumentQuickPulse {
        const document = this._createQuickPulseDocument(envelope);
        const baseData = (envelope.data as any).baseData;
        const requestDocument: Contracts.RequestDocumentQuickPulse = {
            ...document,
            Name: baseData.name,
            Success: baseData.success,
            Duration: baseData.duration,
            ResponseCode: baseData.responseCode,
            OperationName: baseData.name, // TODO: is this correct?
        };

        return requestDocument;
    }

    private _createQuickPulseDependencyDocument(
        envelope: Envelope
    ): Contracts.DependencyDocumentQuickPulse {
        const document = this._createQuickPulseDocument(envelope);
        const baseData = (envelope.data as any).baseData;

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
        };
        return dependencyDocument;
    }

    private _createQuickPulseDocument(envelope: Envelope): Contracts.DocumentQuickPulse {
        let documentType: Constants.QuickPulseDocumentType;
        let __type: Constants.QuickPulseType;
        let operationId, properties;

        if (envelope.data.baseType) {
            __type =
                Constants.TelemetryTypeStringToQuickPulseType[
                    envelope.data.baseType as Contracts.TelemetryTypeValues
                ];
            documentType =
                Constants.TelemetryTypeStringToQuickPulseDocumentType[
                    envelope.data.baseType as Contracts.TelemetryTypeValues
                ];
        } else {
            // Remark: This should never be hit because createQuickPulseDocument is only called within
            // valid baseType values
            Logger.getInstance().warn(
                "Document type invalid; not sending live metric document",
                envelope.data.baseType
            );
        }

        operationId = envelope.tags[KnownContextTagKeys.AiOperationId];
        properties = this._aggregateProperties(envelope);

        var document: Contracts.DocumentQuickPulse = {
            DocumentType: documentType,
            __type: __type,
            OperationId: operationId,
            Version: "1.0",
            Properties: properties,
        };

        return document;
    }

    private _aggregateProperties(envelope: Envelope): Contracts.IDocumentProperty[] {
        const properties: Contracts.IDocumentProperty[] = [];

        // Collect measurements
        const meas = (envelope.data as any).baseData.measurements || {};
        for (let key in meas) {
            if (meas.hasOwnProperty(key)) {
                const value = meas[key];
                const property: Contracts.IDocumentProperty = { key, value };
                properties.push(property);
            }
        }

        // Collect properties
        const props = (envelope.data as any).baseData.properties || {};
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
