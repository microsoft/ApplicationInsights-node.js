import { diag } from "@opentelemetry/api";
import { Util } from "./util";

/**
 * Patches the OpenTelemetry Winston transport to sanitize attribute values
 * that contain arrays of objects or other complex types that are not valid
 * OpenTelemetry attribute values.
 */
export class WinstonTransportPatcher {
    private static _patched = false;
    private static _getSeverityNumber: ((level: string) => number) | undefined;

    /**
     * Apply the patch to the winston transport utils
     */
    public static patchWinstonTransport(): void {
        if (this._patched) {
            return;
        }

        try {
            // Try to load the winston transport utils module
            let winstonTransportUtils: any;
            try {
                winstonTransportUtils = require("@opentelemetry/winston-transport/build/src/utils");
            } catch (error) {
                // If the module is not available, winston instrumentation is not enabled
                diag.debug("Winston transport utils not available, skipping patch");
                return;
            }

            // Store the original emitLogRecord function
            const originalEmitLogRecord = winstonTransportUtils.emitLogRecord;
            if (!originalEmitLogRecord) {
                diag.debug("Winston transport emitLogRecord function not found, skipping patch");
                return;
            }

            // Override the emitLogRecord function with a sanitized version
            winstonTransportUtils.emitLogRecord = function(record: any, logger: any) {
                const { message, level, ...splat } = record;
                const attributes: any = {};
                
                for (const key in splat) {
                    if (Object.prototype.hasOwnProperty.call(splat, key)) {
                        attributes[key] = WinstonTransportPatcher.sanitizeAttributeValue(splat[key]);
                    }
                }

                const logRecord = {
                    severityNumber: this._getSeverityNumber ? this._getSeverityNumber(level) : undefined,
                    severityText: level,
                    body: message,
                    attributes: attributes,
                };
                
                logger.emit(logRecord);
            };

            // Store getSeverityNumber if it exists for reuse
            if (winstonTransportUtils.getSeverityNumber) {
                this._getSeverityNumber = winstonTransportUtils.getSeverityNumber;
            }

            this._patched = true;
            diag.debug("Winston transport patched successfully for attribute sanitization");
        } catch (error) {
            diag.warn("Failed to patch Winston transport", error);
        }
    }

    /**
     * Sanitize an attribute value to ensure it's valid for OpenTelemetry
     */
    private static sanitizeAttributeValue(value: any): any {
        if (value == null) {
            return value;
        }

        // Handle arrays
        if (Array.isArray(value)) {
            // Check if it's a homogeneous array of primitives
            if (this.isValidPrimitiveArray(value)) {
                return value;
            }
            // If not valid, stringify the array
            return Util.getInstance().stringify(value) || String(value);
        }

        // Handle primitive types that are valid
        const valueType = typeof value;
        if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
            return value;
        }

        // Handle Uint8Array (byte arrays are valid)
        if (value instanceof Uint8Array) {
            return value;
        }

        // For any other types (objects, functions, etc.), stringify them
        return Util.getInstance().stringify(value) || String(value);
    }

    /**
     * Check if an array contains only homogeneous primitive values
     */
    private static isValidPrimitiveArray(arr: any[]): boolean {
        if (arr.length === 0) {
            return true;
        }

        let expectedType: string | null = null;
        
        for (const element of arr) {
            // null/undefined elements are allowed
            if (element == null) {
                continue;
            }
            
            const elementType = typeof element;
            
            // Only allow primitive types
            if (elementType !== 'string' && elementType !== 'number' && elementType !== 'boolean') {
                return false;
            }
            
            if (expectedType === null) {
                expectedType = elementType;
            } else if (elementType !== expectedType) {
                // Mixed types are not allowed
                return false;
            }
        }
        
        return true;
    }
}