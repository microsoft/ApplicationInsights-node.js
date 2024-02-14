export const isWindows = (): boolean => {
    return  process.platform === "win32";
}

export const isLinux = (): boolean => {
    return  process.platform === "linux";
}

export const isWebApp = (): boolean => {
    return (process.env.WEBSITE_SITE_NAME && !process.env.FUNCTIONS_WORKER_RUNTIME) ? true : false;
}

export const isFunctionApp = (): boolean => {
    return process.env.FUNCTIONS_WORKER_RUNTIME ? true : false;
}

/**
 * Get prefix for OS
 * Windows system: "w"
 * Linux system: "l"
 * non-Windows and non-Linux system: "u" (unknown)
 */
export const getOsPrefix = (): string => {
    return isWindows() ? "w" : isLinux() ? "l" : "u";
}

/**
 * TODO: add vm resource provider
 * Get prefix resource provider, vm will considered as "unknown RP"
 * Web App: "a"
 * Function App: "f"
 * non-Web and non-Function APP: "u" (unknown)
 */
export const getResourceProvider = (): string => {
    return isWebApp() ? "a" : isFunctionApp() ? "f" : "u";
}
