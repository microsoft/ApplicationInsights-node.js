import Util = require("./Util");
import Config = require("./Config");

class CorrelationIdManager {
    public static correlationIdPrefix = "cid-v1:";
    public static w3cEnabled = true;
    public static HTTP_TIMEOUT: number = 2500; // 2.5 seconds


    private static requestIdMaxLength = 1024;
    private static currentRootId = Util.randomu32();

    public static queryCorrelationId(config: Config, callback: (correlationId: string) => void) {
        // No Op, App ID Exchange not required in SDK anymore
    }

    public static cancelCorrelationIdQuery(config: Config, callback: (correlationId: string) => void) {
        // No Op, App ID Exchange not required in SDK anymore
    }

    /**
     * Generate a request Id according to https://github.com/lmolkova/correlation/blob/master/hierarchical_request_id.md
     * @param parentId
     */
    public static generateRequestId(parentId: string): string {
        if (parentId) {
            parentId = parentId[0] == "|" ? parentId : "|" + parentId;
            if (parentId[parentId.length - 1] !== ".") {
                parentId += ".";
            }

            const suffix = (CorrelationIdManager.currentRootId++).toString(16);

            return CorrelationIdManager.appendSuffix(parentId, suffix, "_")
        } else {
            return CorrelationIdManager.generateRootId();
        }
    }

    /**
     * Given a hierarchical identifier of the form |X.*
     * return the root identifier X
     * @param id
     */
    public static getRootId(id: string): string {
        let endIndex = id.indexOf(".");
        if (endIndex < 0) {
            endIndex = id.length;
        }

        const startIndex = id[0] === "|" ? 1 : 0;
        return id.substring(startIndex, endIndex);
    }

    private static generateRootId(): string {
        return "|" + Util.w3cTraceId() + ".";
    }

    private static appendSuffix(parentId: string, suffix: string, delimiter: string): string {
        if (parentId.length + suffix.length < CorrelationIdManager.requestIdMaxLength) {
            return parentId + suffix + delimiter;
        }

        // Combined identifier would be too long, so we must truncate it.
        // We need 9 characters of space: 8 for the overflow ID, 1 for the
        // overflow delimiter '#'
        let trimPosition = CorrelationIdManager.requestIdMaxLength - 9;
        if (parentId.length > trimPosition) {
            for (; trimPosition > 1; --trimPosition) {
                const c = parentId[trimPosition - 1];
                if (c === "." || c === "_") {
                    break;
                }
            }
        }

        if (trimPosition <= 1) {
            // parentId is not a valid ID
            return CorrelationIdManager.generateRootId();
        }

        suffix = Util.randomu32().toString(16);
        while (suffix.length < 8) {
            suffix = "0" + suffix;
        }
        return parentId.substring(0, trimPosition) + suffix + "#";
    }
}

export = CorrelationIdManager;
