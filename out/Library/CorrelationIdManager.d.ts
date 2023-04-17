import Config = require("./Config");
declare class CorrelationIdManager {
    static correlationIdPrefix: string;
    static w3cEnabled: boolean;
    static HTTP_TIMEOUT: number;
    private static requestIdMaxLength;
    private static currentRootId;
    static queryCorrelationId(config: Config, callback: (correlationId: string) => void): void;
    static cancelCorrelationIdQuery(config: Config, callback: (correlationId: string) => void): void;
    /**
     * Generate a request Id according to https://github.com/lmolkova/correlation/blob/master/hierarchical_request_id.md
     * @param parentId
     */
    static generateRequestId(parentId: string): string;
    /**
     * Given a hierarchical identifier of the form |X.*
     * return the root identifier X
     * @param id
     */
    static getRootId(id: string): string;
    private static generateRootId;
    private static appendSuffix;
}
export = CorrelationIdManager;
