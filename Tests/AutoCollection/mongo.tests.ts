import assert = require("assert");
import sinon = require("sinon");
import AppInsights = require("../../applicationinsights");
import { channel, IStandardEvent } from "diagnostic-channel";
import { enable, dispose as disable } from "../../AutoCollection/diagnostic-channel/mongodb.sub";
import { mongodb } from "diagnostic-channel-publishers";

describe("diagnostic-channel/mongodb", () => {
    afterEach(() => {
        AppInsights.dispose();
        disable();
    });

    it("should send enhanced autocollection telemetry if enhancedDependencyCollection === true", () => {
        AppInsights.setup("key");
        AppInsights.start();

        const trackDependencyStub = sinon.stub(AppInsights.defaultClient, "trackDependency");

        disable();
        enable(true, AppInsights.defaultClient);

        const mongoEvent: mongodb.IMongoData = {
            startedData: {
                command: {
                    find: {
                        filter: {},
                        find: "some database"
                    },
                    insert: {
                        foo: "bar"
                    }
                }
            },
            event: {
                commandName: "find"
            },
            succeeded: true
        }
        AppInsights.defaultClient.config.enhancedDependencyCollection = true;
        channel.publish("mongodb", mongoEvent);

        assert.ok(trackDependencyStub.calledOnce);
        assert.deepEqual(trackDependencyStub.args[0][0].data, JSON.stringify(mongoEvent.startedData.command.find))

        trackDependencyStub.restore();
    });

    it("should not send enhanced autocollection telemetry by default", () => {
        AppInsights.setup("key");
        AppInsights.start();

        const trackDependencyStub = sinon.stub(AppInsights.defaultClient, "trackDependency");

        disable();
        enable(true, AppInsights.defaultClient);

        const mongoEvent: mongodb.IMongoData = {
            startedData: {
                command: {
                    find: {
                        filter: {},
                        find: "some database"
                    },
                    insert: {
                        foo: "bar"
                    }
                }
            },
            event: {
                commandName: "find"
            },
            succeeded: true
        }
        channel.publish("mongodb", mongoEvent);

        assert.ok(trackDependencyStub.calledOnce);
        assert.deepEqual(trackDependencyStub.args[0][0].data, mongoEvent.event.commandName)

        trackDependencyStub.restore();
    });
});
