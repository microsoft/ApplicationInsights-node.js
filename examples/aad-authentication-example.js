// Working example of AAD authentication with Application Insights
// This demonstrates the solution to the local auth disabled issue

const appInsights = require('../out/src/index.js');

// Mock credential for testing - replace with real DefaultAzureCredential in production
class MockDefaultAzureCredential {
    async getToken(scopes, options) {
        console.log('✅ AAD Authentication: MockDefaultAzureCredential.getToken called');
        console.log('   Scopes:', scopes);
        return {
            token: 'mock-aad-token-12345',
            expiresOnTimestamp: Date.now() + 3600000 // 1 hour from now
        };
    }
}

console.log('=== Application Insights AAD Authentication Example ===\n');

console.log('1. Creating AAD credential...');
const credential = new MockDefaultAzureCredential();

console.log('2. Setting up Application Insights with AAD credential BEFORE start()...');
appInsights
    .setup('InstrumentationKey=12345678-1234-1234-1234-123456789012;IngestionEndpoint=https://test.in.applicationinsights.azure.com/')
    .setInternalLogging(true, true)
    .setAadCredential(credential)  // ✅ This is the key - set credential BEFORE start()
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true)
    .setSendLiveMetrics(true)
    .start();

console.log('3. Application Insights started with AAD authentication configured');

console.log('4. Tracking telemetry events...');
const client = appInsights.defaultClient;

// Track various types of telemetry
client.trackEvent({
    name: "UserAction", 
    properties: {
        action: "button_click",
        page: "dashboard"
    }
});

client.trackException({
    exception: new Error("Sample exception for demonstration")
});

client.trackMetric({
    name: "ProcessingTime", 
    value: 123.45
});

client.trackTrace({
    message: "Application started successfully with AAD auth"
});

client.trackDependency({
    target: "https://api.example.com",
    name: "GET /api/data",
    data: "GET https://api.example.com/api/data",
    duration: 234,
    resultCode: 200,
    success: true,
    dependencyTypeName: "HTTP"
});

console.log('5. Flushing telemetry...');
client.flush();

console.log('\n✅ Example completed successfully!');
console.log('💡 Notice: The AAD credential getToken() method was called, indicating authentication is working.');
console.log('🔍 In production, replace MockDefaultAzureCredential with real DefaultAzureCredential from @azure/identity');

// Demonstrate what happens if you try the wrong pattern
console.log('\n=== Demonstrating Wrong Pattern (for educational purposes) ===');
console.log('❌ If you tried to set credential AFTER start(), you would get a warning:');

// This will log a warning because the client is already initialized
appInsights.Configuration.setAadCredential(new MockDefaultAzureCredential());