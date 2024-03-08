export function checkWarnings(warning: string, warnings: string[]) {
    let expectedWarning: any;
    for (let i = 0; i < warnings.length; i++) {
        if (warnings[i].toString().includes(warning)) {
            expectedWarning = warnings[i];
        }
    }
    return expectedWarning;
}
