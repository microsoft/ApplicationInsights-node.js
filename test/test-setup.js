// Test setup file that loads all mocks
// This file will be included in the test command to ensure all mocks are loaded before tests run

// Load QuickPulse service mocks
const { mockQuickPulseEndpoints } = require("./mocks/quickpulse-mock");

// Apply all mocks
console.log("[Test Setup] Applying QuickPulse service mocks to prevent real network connections");
mockQuickPulseEndpoints();

// Ensure nock prevents ALL network connections
const nock = require("nock");
nock.disableNetConnect();
console.log("[Test Setup] All network connections disabled - only mocked endpoints will work");
