import * as assert from "assert";

import * as Constants from "../../../src/declarations/Constants";
import { ConnectionStringParser } from "../../../src/library/Configuration/ConnectionStringParser";

describe("ConnectionStringParser", () => {
    describe("#parse()", () => {
        it("should parse all valid fields", () => {
            const instrumentationKey = "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
            const ingestionEndpoint = "ingest";
            const liveEndpoint = "live";
            var connectionString = `InstrumentationKey=${instrumentationKey};IngestionEndpoint=${ingestionEndpoint};LiveEndpoint=${liveEndpoint};`;
            let connectionStringPrser = new ConnectionStringParser();
            const result = connectionStringPrser.parse(connectionString);
            assert.deepEqual(result.instrumentationkey, instrumentationKey);
            assert.deepEqual(result.ingestionendpoint, ingestionEndpoint);
            assert.deepEqual(result.liveendpoint, liveEndpoint);
        });

        it("should ignore invalid fields", () => {
            const instrumentationKey = "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
            const ingestionEndpoint = "ingest";
            const liveEndpoint = "live";
            const connectionString = `Instrume.ntationKey=${instrumentationKey};Ingestion.Endpoint=${ingestionEndpoint};LiveEnd.point=${liveEndpoint}`;
            let connectionStringPrser = new ConnectionStringParser();
            const result = connectionStringPrser.parse(connectionString);
            assert.deepEqual(result.instrumentationkey, undefined);
            assert.deepEqual(result.ingestionendpoint, Constants.DEFAULT_BREEZE_ENDPOINT);
            assert.deepEqual(result.liveendpoint, Constants.DEFAULT_LIVEMETRICS_ENDPOINT);
        });

        const runTest = (options: {
            connectionString: string;
            expectedInstrumentationKey?: string;
            expectedBreezeEndpoint: string;
            expectedLiveMetricsEndpoint: string;
        }) => {
            let connectionStringPrser = new ConnectionStringParser();
            const result = connectionStringPrser.parse(options.connectionString);
            if (options.expectedInstrumentationKey)
                assert.deepEqual(result.instrumentationkey, options.expectedInstrumentationKey);
            assert.deepEqual(result.ingestionendpoint, options.expectedBreezeEndpoint);
            assert.deepEqual(result.liveendpoint, options.expectedLiveMetricsEndpoint);
        };

        it("should use correct default endpoints", () => {
            runTest({
                connectionString: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",
                expectedInstrumentationKey: "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",
                expectedBreezeEndpoint: Constants.DEFAULT_BREEZE_ENDPOINT,
                expectedLiveMetricsEndpoint: Constants.DEFAULT_LIVEMETRICS_ENDPOINT,
            });
        });

        it("should use correct endpoints when using EndpointSuffix", () => {
            runTest({
                connectionString:
                    "InstrumentationKey=00000000-0000-0000-0000-000000000000;EndpointSuffix=ai.contoso.com",
                expectedBreezeEndpoint: "https://dc.ai.contoso.com",
                expectedLiveMetricsEndpoint: "https://live.ai.contoso.com",
            });
        });

        it("should use correct endpoints when using EndpointSuffix with explicit override", () => {
            runTest({
                connectionString:
                    "InstrumentationKey=00000000-0000-0000-0000-000000000000;EndpointSuffix=ai.contoso.com;LiveEndpoint=https://custom.live.contoso.com:444",
                expectedBreezeEndpoint: "https://dc.ai.contoso.com",
                expectedLiveMetricsEndpoint: "https://custom.live.contoso.com:444",
            });
        });

        it("should parse EndpointSuffix + Location", () => {
            runTest({
                connectionString:
                    "InstrumentationKey=00000000-0000-0000-0000-000000000000;EndpointSuffix=ai.contoso.com;Location=westus2",
                expectedBreezeEndpoint: "https://westus2.dc.ai.contoso.com",
                expectedLiveMetricsEndpoint: "https://westus2.live.ai.contoso.com",
            });
        });

        it("should parse EndpointSuffix + Location + Endpoint Override", () => {
            runTest({
                connectionString:
                    "InstrumentationKey=00000000-0000-0000-0000-000000000000;EndpointSuffix=ai.contoso.com;Location=westus2;LiveEndpoint=https://custom.contoso.com:444",
                expectedBreezeEndpoint: "https://westus2.dc.ai.contoso.com",
                expectedLiveMetricsEndpoint: "https://custom.contoso.com:444",
            });
        });

        it("should parse Endpoint Override", () => {
            runTest({
                connectionString:
                    "InstrumentationKey=00000000-0000-0000-0000-000000000000;LiveEndpoint=http://custom.live.endpoint.com:444",
                expectedBreezeEndpoint: Constants.DEFAULT_BREEZE_ENDPOINT,
                expectedLiveMetricsEndpoint: "https://custom.live.endpoint.com:444",
            });
        });
    });
});
