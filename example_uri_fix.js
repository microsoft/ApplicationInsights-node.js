#!/usr/bin/env node
// Example demonstrating the URI malformed error fix

const { safeDecodeURI, safeDecodeURIComponent } = require('./out/src/index');

console.log('=== ApplicationInsights URI Malformed Error Fix Demo ===\n');

// Example 1: Malformed URI that would cause the original error
console.log('Example 1: Malformed URI (original issue scenario)');
const malformedCookie = 'ai_authUser=user%ZZ|other=value';
console.log('Input:', malformedCookie);
console.log('Result with safeDecodeURI:', safeDecodeURI(malformedCookie));
console.log('Result with custom fallback:', safeDecodeURI(malformedCookie, 'MALFORMED_COOKIE'));

// Compare with native decodeURI (would throw error)
console.log('Native decodeURI would throw:', 'URIError: URI malformed');
console.log('');

// Example 2: Valid URI should work normally
console.log('Example 2: Valid URI (should work normally)');
const validURI = 'https://example.com/test%20path';
console.log('Input:', validURI);
console.log('Result:', safeDecodeURI(validURI));
console.log('');

// Example 3: Various malformed scenarios
console.log('Example 3: Various malformed scenarios');
const malformedScenarios = [
    'test%ZZ',      // Invalid hex
    'test%GG',      // Invalid hex
    'test%',        // Incomplete
    'test%1',       // Incomplete
    null,           // null
    undefined,      // undefined
    123,            // non-string
    ''              // empty string
];

malformedScenarios.forEach((scenario, index) => {
    console.log(`Scenario ${index + 1}:`, scenario, '->', safeDecodeURI(scenario));
});

console.log('\n=== All scenarios handled gracefully without errors or warnings ===');