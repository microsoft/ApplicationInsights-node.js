export declare const isWindows: () => boolean;
export declare const isLinux: () => boolean;
export declare const isWebApp: () => boolean;
export declare const isFunctionApp: () => boolean;
/**
 * Get prefix for OS
 * Windows system: "w"
 * Linux system: "l"
 * non-Windows and non-Linux system: "u" (unknown)
 */
export declare const getOsPrefix: () => string;
/**
 * TODO: add vm resource provider
 * Get prefix resource provider, vm will considered as "unknown RP"
 * Web App: "a"
 * Function App: "f"
 * non-Web and non-Function APP: "u" (unknown)
 */
export declare const getResourceProvider: () => string;
