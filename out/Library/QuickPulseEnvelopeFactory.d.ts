import Contracts = require("../Declarations/Contracts");
import Config = require("./Config");
import Context = require("./Context");
declare class QuickPulseEnvelopeFactory {
    private static keys;
    static createQuickPulseEnvelope(metrics: Contracts.MetricQuickPulse[], documents: Contracts.DocumentQuickPulse[], config: Config, context: Context): Contracts.EnvelopeQuickPulse;
    static createQuickPulseMetric(telemetry: Contracts.MetricTelemetry): Contracts.MetricQuickPulse;
    static telemetryEnvelopeToQuickPulseDocument(envelope: Contracts.Envelope): Contracts.DocumentQuickPulse;
    private static createQuickPulseEventDocument;
    private static createQuickPulseTraceDocument;
    private static createQuickPulseExceptionDocument;
    private static createQuickPulseRequestDocument;
    private static createQuickPulseDependencyDocument;
    private static createQuickPulseDocument;
    private static aggregateProperties;
}
export = QuickPulseEnvelopeFactory;
