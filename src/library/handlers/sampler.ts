// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Sampler, SamplingDecision, SamplingResult } from '@opentelemetry/api';


export class ApplicationInsightsSampler implements Sampler {

    private readonly _samplingPercentage: number

    constructor(samplingPercentage: number = 100) {
        this._samplingPercentage = samplingPercentage;
    }

    public shouldSample(context: unknown, traceId: string): SamplingResult {
        let isSampledIn = false;

        if (this._samplingPercentage == 100) {
            isSampledIn = true;
        }
        else if (this._samplingPercentage == 0) {
            isSampledIn = false;
        }
        else {
            if (!traceId) {
                isSampledIn = (Math.random() * 100) < this._samplingPercentage;
            }
            else {
                isSampledIn = this._getSamplingHashCode(traceId) < this._samplingPercentage;

            }

        }
        return isSampledIn ? { decision: SamplingDecision.RECORD_AND_SAMPLED } : { decision: SamplingDecision.NOT_RECORD };
    }

    public toString(): string {
        return 'ApplicationInsightsSampler';
    }

    /** Ported from AI .NET SDK */
    private _getSamplingHashCode(input: string): number {
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
}