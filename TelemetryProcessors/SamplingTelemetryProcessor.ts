import Contracts = require("../Declarations/Contracts");
import { CorrelationContext } from "../AutoCollection/CorrelationContextManager";

/**
 *  A telemetry processor that handles sampling.
 */
export function samplingTelemetryProcessor(envelope: Contracts.EnvelopeTelemetry, contextObjects: { correlationContext: CorrelationContext }): boolean {
    var samplingPercentage = envelope.sampleRate; // Set for us in Client.getEnvelope
    var isSampledIn = false;

    if (samplingPercentage === null || samplingPercentage === undefined || samplingPercentage >= 100) {
        return true;
    } else if (envelope.data && Contracts.TelemetryType.Metric === Contracts.baseTypeToTelemetryType(envelope.data.baseType as Contracts.TelemetryTypeValues)) {
        // Exclude MetricData telemetry from sampling
        return true;
    } else if (contextObjects.correlationContext && contextObjects.correlationContext.operation) {
        // If we're using dependency correlation, sampling should retain all telemetry from a given request
        isSampledIn = getSamplingHashCode(contextObjects.correlationContext.operation.id) < samplingPercentage;
    } else {
        // If we're not using dependency correlation, sampling should use a random distribution on each item
        isSampledIn = (Math.random() * 100) < samplingPercentage;
    }

    return isSampledIn;
}

/** Ported from AI .NET SDK */
export function getSamplingHashCode(input: string): number {
    var csharpMin = -2147483648;
    var csharpMax = 2147483647;
    var hash = 5381;

    if (!input) {
        return 0;
    }

    while (input.length < 8) {
        input = input + input;
    }

    for (var i = 0; i < input.length; i++) {
        // JS doesn't respond to integer overflow by wrapping around. Simulate it with bitwise operators ( | 0)
        hash = ((((hash << 5) + hash) | 0) + input.charCodeAt(i) | 0);
    }

    hash = hash <= csharpMin ? csharpMax : Math.abs(hash);
    return (hash / csharpMax) * 100;
}