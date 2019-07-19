import assert = require("assert");
import sinon = require("sinon");
import ConnectionStrinParser = require("../../Library/ConnectionStringParser");

describe("ConnectionStringParser", () => {
    describe("#parse()", () => {
        it("should parse all valid fields", () => {
            const authorization = "ikey"
            const instrumentationKey = "instr_key";
            const ingestionEndpoint = "ingest";
            const liveEndpoint = "live";
            const connectionString = `Authorization=${authorization};InstrumentationKey=${instrumentationKey};IngestionEndpoint=${ingestionEndpoint};LiveEndpoint=${liveEndpoint}`;

            const result = ConnectionStrinParser.parse(connectionString);

            assert.deepStrictEqual(result.authorization, authorization);
            assert.deepStrictEqual(result.instrumentationkey, instrumentationKey);
            assert.deepStrictEqual(result.ingestionendpoint, ingestionEndpoint);
            assert.deepStrictEqual(result.liveendpoint, liveEndpoint);
        });

        it("should parse ignore invalid fields", () => {
            const authorization = "ikey"
            const instrumentationKey = "instr_key";
            const ingestionEndpoint = "ingest";
            const liveEndpoint = "live";
            const connectionString = `Autho.rization=${authorization};Instrume.ntationKey=${instrumentationKey};Ingestion.Endpoint=${ingestionEndpoint};LiveEnd.point=${liveEndpoint}`;

            const result = ConnectionStrinParser.parse(connectionString);

            assert.deepStrictEqual(result.authorization, undefined);
            assert.deepStrictEqual(result.instrumentationkey, undefined);
            assert.deepStrictEqual(result.ingestionendpoint, undefined);
            assert.deepStrictEqual(result.liveendpoint, undefined);
        });

        it("should parse ignore invalid fields", () => {
            const authorization = "ikey"
            const instrumentationKey = "ikey";
            const ingestionEndpoint = "ingest";
            const liveEndpoint = "live";
            const connectionString = `Autho.rization=${authorization};Instrume.ntationKey=${instrumentationKey};Ingestion.Endpoint=${ingestionEndpoint};LiveEnd.point=${liveEndpoint}`;

            const result = ConnectionStrinParser.parse(connectionString);

            assert.deepStrictEqual(result.authorization, undefined);
            assert.deepStrictEqual(result.instrumentationkey, undefined);
            assert.deepStrictEqual(result.ingestionendpoint, undefined);
            assert.deepStrictEqual(result.liveendpoint, undefined);
        });
    });
});
