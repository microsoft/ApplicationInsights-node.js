"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResourceProvider = exports.getOsPrefix = exports.isFunctionApp = exports.isWebApp = exports.isLinux = exports.isWindows = void 0;
var isWindows = function () {
    return process.platform === "win32";
};
exports.isWindows = isWindows;
var isLinux = function () {
    return process.platform === "linux";
};
exports.isLinux = isLinux;
var isWebApp = function () {
    return process.env.WEBSITE_SITE_NAME ? true : false;
};
exports.isWebApp = isWebApp;
var isFunctionApp = function () {
    return process.env.FUNCTIONS_WORKER_RUNTIME ? true : false;
};
exports.isFunctionApp = isFunctionApp;
/**
 * Get prefix for OS
 * Windows system: "w"
 * Linux system: "l"
 * non-Windows and non-Linux system: "u" (unknown)
 */
var getOsPrefix = function () {
    return exports.isWindows() ? "w" : exports.isLinux() ? "l" : "u";
};
exports.getOsPrefix = getOsPrefix;
/**
 * TODO: add vm resource provider
 * Get prefix resource provider, vm will considered as "unknown RP"
 * Web App: "a"
 * Function App: "f"
 * non-Web and non-Function APP: "u" (unknown)
 */
var getResourceProvider = function () {
    return exports.isWebApp() ? "a" : exports.isFunctionApp() ? "f" : "u";
};
exports.getResourceProvider = getResourceProvider;
//# sourceMappingURL=PrefixHelper.js.map