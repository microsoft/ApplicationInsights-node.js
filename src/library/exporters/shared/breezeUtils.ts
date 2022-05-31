// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Breeze errors.
 * @internal
 */
export interface IBreezeError {
    index: number;
    statusCode: number;
    message: string;
}

/**
 * Breeze response definition.
 * @internal
 */
export interface IBreezeResponse {
    itemsReceived: number;
    itemsAccepted: number;
    errors: IBreezeError[];
}

/**
 * Breeze retriable status codes.
 * @internal
 */
export function isRetriable(statusCode: number): boolean {
    return (
        statusCode === 206 || // Retriable
        statusCode === 401 || // Unauthorized
        statusCode === 403 || // Forbidden
        statusCode === 408 || // Timeout
        statusCode === 429 || // Throttle
        statusCode === 439 || // Quota
        statusCode === 500 || // Server Error
        statusCode === 503 // Server Unavailable
    );
}

