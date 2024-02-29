export function checkWarnings(warning: string, warnStub: sinon.SinonStub) {
    let expectedWarning: any;
    for (let i = 0; i < warnStub.args.length; i++) {
        if (warnStub.args[i].toString().includes(warning)) {
            expectedWarning = warnStub.args[i];
        }
    }
    return expectedWarning;
}
