import * as assert from "assert";

import { Contracts, TelemetryClient } from "../../../../src/applicationinsights";
import {
    KnownContextTagKeys,
    TelemetryItem as Envelope,
} from "../../../../src/declarations/Generated";
import * as AzureProps from "../../../../src/library/TelemetryProcessors/AzureRoleEnvironmentTelemetryInitializer";

describe("TelemetryProcessors/AzureRoleEnvironmentTelemetryInitializer", () => {
    var ikey = "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
    var envelope: Envelope = {
        name: "name",
        data: {
            baseType: "SomeData",
        },
        instrumentationKey: ikey,
        sampleRate: 100,
        time: new Date(),
    };
    var client = new TelemetryClient(ikey);

    describe("#azureRoleEnvironmentTelemetryProcessor()", () => {
        it("will add cloud role", () => {
            const env = <{ [id: string]: string }>{};
            const originalEnv = process.env;
            env.WEBSITE_SITE_NAME = "testRole";
            process.env = env;
            AzureProps.azureRoleEnvironmentTelemetryProcessor(envelope, client.context);
            assert.equal(envelope.tags[KnownContextTagKeys.AiCloudRole], "testRole");
            process.env = originalEnv;
        });
    });
});
