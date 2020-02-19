import { AgentLogger } from "./DataModel";

export function sdkAlreadyExists(_logger: AgentLogger = console): boolean {
    try {
        // appInstance should either resolve to user SDK or crash. If it resolves to attach SDK, user probably modified their NODE_PATH
        let appInstance;
        try {
            // Node 8.9+
            appInstance = (require.resolve as any)("applicationinsights", { paths: process.cwd() });
        } catch (e) {
            // Node <8.9
            appInstance = require.resolve(process.cwd() + "/node_modules/applicationinsights");
        }
        const attachInstance = require.resolve("../applicationinsights");
        if (appInstance !== attachInstance) {
            _logger.log(
                "applicationinsights module is already installed in this application; not re-attaching. Installed SDK location:",
                appInstance
            );
            return true;
        }
        // User probably modified their NODE_PATH to resolve to this instance. Attach appinsights
        return false;
    } catch (e) {
        // crashed while trying to resolve "applicationinsights", so SDK does not exist. Attach appinsights
        return false;
    }
}
