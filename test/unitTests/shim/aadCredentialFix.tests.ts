// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import assert from "assert";
import sinon from "sinon";
import * as azureCoreAuth from "@azure/core-auth";

import { TelemetryClient } from "../../../src/shim/telemetryClient";

class TestTokenCredential implements azureCoreAuth.TokenCredential {
    private _numberOfRefreshs = 0;

    async getToken(scopes: string | string[], options?: any): Promise<any> {
        this._numberOfRefreshs++;
        return {
            token: "testToken" + this._numberOfRefreshs,
            expiresOnTimestamp: new Date()
        };
    }
}

describe("shim/telemetryClient AAD credential fix", () => {
    let client: TelemetryClient;
    let trackEventStub: sinon.SinonStub;

    beforeEach(() => {
        client = new TelemetryClient("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        // Stub the track method to avoid actual telemetry
        trackEventStub = sinon.stub(client, 'trackEvent').callsFake(() => {});
    });

    afterEach(() => {
        if (client) {
            client.shutdown();
        }
        sinon.restore();
    });

    it("should allow setting aadTokenCredential after initialization", () => {
        // Initialize the client (simulates what happens in start())
        client.initialize();

        // Set credential after initialization (user scenario)
        const credential = new TestTokenCredential();
        client.config.aadTokenCredential = credential;

        // Parse config to see if credential is properly handled
        const options = client.config.parseConfig();
        assert.strictEqual(options.azureMonitorExporterOptions.credential, credential, "Credential should be in options");

        // Track event to ensure no errors
        client.trackEvent({name: "test event"});
        assert.ok(trackEventStub.calledOnce, "trackEvent should have been called");
    });

    it("should warn when setAadCredential is called after initialization", () => {
        // Import the applicationinsights module
        const appInsights = require("../../../src/shim/applicationinsights");
        
        // Set up a client
        appInsights.setup("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        appInsights.start(); // This initializes the client
        
        const mockClient = appInsights.defaultClient;
        const pushWarningStub = sinon.stub(mockClient, 'pushWarningToLog');
        
        // Try to set credential after start() - should warn
        const credential = new TestTokenCredential();
        appInsights.Configuration.setAadCredential(credential);
        
        // Should have logged a warning
        assert.ok(pushWarningStub.calledOnce, "Warning should have been logged");
        assert.ok(pushWarningStub.calledWith(sinon.match(/setAadCredential called after client initialization/)), 
                 "Warning message should mention setAadCredential");
        
        // Clean up
        appInsights.dispose();
        pushWarningStub.restore();
    });

    it("should set credential properly when called before start", () => {
        const appInsights = require("../../../src/shim/applicationinsights");
        
        // Set up but don't start yet
        appInsights.setup("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        
        // Set credential before start
        const credential = new TestTokenCredential();
        appInsights.Configuration.setAadCredential(credential);
        
        // Start the client
        appInsights.start();
        
        // Verify credential is set
        const mockClient = appInsights.defaultClient;
        assert.strictEqual(mockClient.config.aadTokenCredential, credential, "Credential should be set on config");
        
        // Clean up
        appInsights.dispose();
    });
});