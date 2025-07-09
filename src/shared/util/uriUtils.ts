// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Utility functions for safely handling URI operations
 * 
 * This module provides safe alternatives to JavaScript's built-in decodeURI() and decodeURIComponent()
 * functions that can throw URIError when given malformed URI strings.
 * 
 * These utilities were created to address issue #1404 where malformed auth cookies
 * in HTTP requests would cause the SDK to log verbose warning messages when decodeURI()
 * failed with "URI malformed" errors.
 * 
 * @see https://github.com/microsoft/ApplicationInsights-node.js/issues/1404
 */

/**
 * Safely decodes a URI string, handling malformed URIs gracefully
 * @param uri The URI string to decode
 * @param defaultValue The default value to return if decoding fails
 * @returns The decoded URI string or the default value if decoding fails
 */
export function safeDecodeURI(uri: string, defaultValue: string = ""): string {
    if (!uri || typeof uri !== "string") {
        return defaultValue;
    }
    
    try {
        return decodeURI(uri);
    } catch (error) {
        // URI is malformed, return default value silently
        // This prevents the verbose warning that was causing issues in version 2.9.6
        return defaultValue;
    }
}

/**
 * Safely decodes a URI component string, handling malformed URIs gracefully
 * @param uriComponent The URI component string to decode
 * @param defaultValue The default value to return if decoding fails
 * @returns The decoded URI component string or the default value if decoding fails
 */
export function safeDecodeURIComponent(uriComponent: string, defaultValue: string = ""): string {
    if (!uriComponent || typeof uriComponent !== "string") {
        return defaultValue;
    }
    
    try {
        return decodeURIComponent(uriComponent);
    } catch (error) {
        // URI component is malformed, return default value silently
        return defaultValue;
    }
}