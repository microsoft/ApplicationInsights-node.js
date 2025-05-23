// Helper to mock QuickPulse service endpoints
// This ensures tests never connect to real external endpoints

const nock = require("nock");

// Mock QuickPulse service endpoints
function mockQuickPulseEndpoints() {
  // Mock the ping endpoint with a successful response
  nock("https://global.livediagnostics.monitor.azure.com:443")
    .persist()
    .get(/\/QuickPulseService\.svc\/ping/)
    .reply(200, {
      "StatusCode": 200,
      "ResponseType": 0,
      "ConnectionPollingInterval": 60000,
      "Messages": []
    });
    
  // Mock the post endpoint for submitting metrics
  nock("https://global.livediagnostics.monitor.azure.com:443")
    .persist()
    .post(/\/QuickPulseService\.svc\/post/)
    .reply(200, {
      "StatusCode": 200,
      "ResponseType": 0,
      "ConnectionPollingInterval": 60000,
      "Messages": []
    });
}

// Export the mocking function so it can be used by tests
module.exports = { mockQuickPulseEndpoints };
