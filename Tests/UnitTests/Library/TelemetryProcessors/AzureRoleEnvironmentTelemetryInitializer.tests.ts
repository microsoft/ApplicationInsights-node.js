import * as assert from "assert";

import { TelemetryClient } from "../../../../src/applicationinsights";
import {
    KnownContextTagKeys,
    TelemetryItem as Envelope,
} from "../../../../src/declarations/Generated";
import { azureRoleEnvironmentTelemetryProcessor } from "../../../../src/library/TelemetryProcessors";

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
        tags: {}
    };
    var client = new TelemetryClient(ikey);

    describe("#azureRoleEnvironmentTelemetryProcessor()", () => {
        it("will add cloud role", () => {
            const env = <{ [id: string]: string }>{};
            const originalEnv = process.env;
            env.WEBSITE_SITE_NAME = "testRole";
            process.env = env;
            azureRoleEnvironmentTelemetryProcessor(envelope, client.context);
            assert.equal(envelope.tags[KnownContextTagKeys.AiCloudRole], "testRole");
            process.env = originalEnv;
        });
    });
});
