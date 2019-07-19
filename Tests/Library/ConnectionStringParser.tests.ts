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

            assert.deepEqual(result.authorization, authorization);
            assert.deepEqual(result.instrumentationkey, instrumentationKey);
            assert.deepEqual(result.ingestionendpoint, ingestionEndpoint);
            assert.deepEqual(result.liveendpoint, liveEndpoint);
        });

        it("should parse ignore invalid fields", () => {
            const authorization = "ikey"
            const instrumentationKey = "instr_key";
            const ingestionEndpoint = "ingest";
            const liveEndpoint = "live";
            const connectionString = `Autho.rization=${authorization};Instrume.ntationKey=${instrumentationKey};Ingestion.Endpoint=${ingestionEndpoint};LiveEnd.point=${liveEndpoint}`;

            const result = ConnectionStrinParser.parse(connectionString);

            assert.deepEqual(result.authorization, undefined);
            assert.deepEqual(result.instrumentationkey, undefined);
            assert.deepEqual(result.ingestionendpoint, undefined);
            assert.deepEqual(result.liveendpoint, undefined);
        });

        it("should parse ignore invalid fields", () => {
            const authorization = "ikey"
            const instrumentationKey = "ikey";
            const ingestionEndpoint = "ingest";
            const liveEndpoint = "live";
            const connectionString = `Autho.rization=${authorization};Instrume.ntationKey=${instrumentationKey};Ingestion.Endpoint=${ingestionEndpoint};LiveEnd.point=${liveEndpoint}`;

            const result = ConnectionStrinParser.parse(connectionString);

            assert.deepEqual(result.authorization, undefined);
            assert.deepEqual(result.instrumentationkey, undefined);
            assert.deepEqual(result.ingestionendpoint, undefined);
            assert.deepEqual(result.liveendpoint, undefined);
        });
    });
});
