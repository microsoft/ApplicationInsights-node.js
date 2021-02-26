import assert = require("assert");
import Client = require("../../Library/TelemetryClient");
import { Contracts } from "../../applicationinsights";

import AzureProps = require("../../TelemetryProcessors/AzureRoleEnvironmentTelemetryInitializer");

describe("TelemetryProcessors/AzureRoleEnvironmentTelemetryInitializer", () => {
    var ikey = "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
    var envelope: Contracts.Envelope = {
        ver: 2,
        name: "name",
        data: {
            baseType: "SomeData"
        },
        iKey: ikey,
        sampleRate: 100,
        seq: "",
        time: "",
        tags: []
    };
    var client = new Client(ikey);

    describe("#azureRoleEnvironmentTelemetryProcessor()", () => {
        it("will add cloud role", () => {
            const env = <{ [id: string]: string }>{};
            const originalEnv = process.env;
            env.WEBSITE_SITE_NAME = "testRole";
            process.env = env;
            AzureProps.azureRoleEnvironmentTelemetryProcessor(envelope, client.context);
            assert.equal(envelope.tags[client.context.keys.cloudRole], "testRole");
            process.env = originalEnv;
        });
    });
});