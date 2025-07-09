# URI Malformed Error Fix

## Issue Overview

In SDK version 2.9.6, users reported encountering verbose warning messages when the Application Insights SDK attempted to decode malformed authentication cookies:

```
ApplicationInsights:Could not decode the auth cookie with error: [
  "[object Error]{ stack: 'URIError: URI malformed\n" +
    "    at decodeURI (<anonymous>)\n" +
    "    at HttpRequestParser._getId (...HttpRequestParser.js:217:26)\n" +
    "    at HttpRequestParser.getRequestTags (...HttpRequestParser.js:118:110)\n" +
    "    at AutoCollectHttpRequests.endRequest (...HttpRequests.js:232:55)\n" +
    "..."
]
```

This error occurred when HTTP requests contained malformed `ai_authUser` cookies that couldn't be properly decoded by JavaScript's `decodeURI()` function.

## Root Cause

The issue was in the `HttpRequestParser._getId` method (in version 2.9.6) which attempted to decode URI-encoded cookies using `decodeURI()`. When cookies contained malformed URI encoding, this function would throw a `URIError` with the message "URI malformed".

While the error was properly caught and handled, the SDK logged a verbose warning message for each occurrence, which could spam application logs.

## Solution

We've created safe URI decoding utilities that handle malformed URIs gracefully:

### New Utility Functions

```typescript
import { safeDecodeURI, safeDecodeURIComponent } from 'applicationinsights';

// Safe alternative to decodeURI()
const decoded = safeDecodeURI(malformedURI, "fallback");

// Safe alternative to decodeURIComponent()  
const decoded = safeDecodeURIComponent(malformedComponent, "fallback");
```

### Key Features

1. **Graceful Error Handling**: Returns a default value instead of throwing errors
2. **Silent Failure**: No verbose warning messages for malformed URIs
3. **Configurable Defaults**: Custom fallback values can be specified
4. **Input Validation**: Handles null, undefined, and non-string inputs safely

### Usage Examples

```typescript
import { safeDecodeURI, safeDecodeURIComponent } from 'applicationinsights';

// Example 1: Parsing cookies safely
const cookieValue = "ai_authUser=user%ZZ|other=value"; // malformed %ZZ
const decoded = safeDecodeURI(cookieValue, ""); // Returns "" instead of throwing

// Example 2: With custom fallback
const userComponent = "user%GG"; // malformed
const userName = safeDecodeURIComponent(userComponent, "anonymous"); // Returns "anonymous"

// Example 3: Valid URIs work normally
const validURI = "https://example.com/test%20path";
const result = safeDecodeURI(validURI); // Returns "https://example.com/test path"
```

## Migration Guide

### For Current Users (SDK 3.x+)

The current version of the SDK (3.x+) has been refactored to use OpenTelemetry and the specific cookie parsing logic that caused this issue has been removed. However, if you're working with URI decoding in your application code, you can use the new safe utilities:

```typescript
// Instead of:
try {
  const decoded = decodeURI(potentiallyMalformedURI);
} catch (error) {
  // Handle error and log warnings
  console.warn("URI decode failed:", error);
  const decoded = "";
}

// Use:
import { safeDecodeURI } from 'applicationinsights';
const decoded = safeDecodeURI(potentiallyMalformedURI);
```

### For Legacy Users (SDK 2.x)

If you're still using SDK version 2.9.6 or earlier, consider upgrading to the latest version to benefit from:
- OpenTelemetry-based telemetry collection
- Improved error handling
- Better performance
- Enhanced security

## Implementation Details

The safe URI utilities work by:

1. **Input Validation**: Check if input is a valid string
2. **Try-Catch Wrapper**: Wrap native `decodeURI()` and `decodeURIComponent()` calls
3. **Silent Failure**: Return default values without logging warnings
4. **Consistent Behavior**: Handle edge cases like null, undefined, and non-string inputs

### Function Signatures

```typescript
function safeDecodeURI(uri: string, defaultValue?: string): string;
function safeDecodeURIComponent(uriComponent: string, defaultValue?: string): string;
```

## Testing

The utilities include comprehensive tests covering:
- Valid URI decoding
- Various malformed URI scenarios
- Edge cases (null, undefined, non-string inputs)
- Cookie-specific scenarios
- Custom default values

All tests pass with 100% code coverage.

## Related Issues

- [#1404](https://github.com/microsoft/ApplicationInsights-node.js/issues/1404) - ApplicationInsights:Could not decode the auth cookie with error

## References

- [MDN: decodeURI()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/decodeURI)
- [MDN: decodeURIComponent()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/decodeURIComponent)
- [Application Insights SDK Documentation](https://docs.microsoft.com/en-us/azure/azure-monitor/app/nodejs)