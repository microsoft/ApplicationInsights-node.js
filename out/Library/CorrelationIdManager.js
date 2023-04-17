"use strict";
var Util = require("./Util");
var CorrelationIdManager = /** @class */ (function () {
    function CorrelationIdManager() {
    }
    CorrelationIdManager.queryCorrelationId = function (config, callback) {
        // No Op, App ID Exchange not required in SDK anymore
    };
    CorrelationIdManager.cancelCorrelationIdQuery = function (config, callback) {
        // No Op, App ID Exchange not required in SDK anymore
    };
    /**
     * Generate a request Id according to https://github.com/lmolkova/correlation/blob/master/hierarchical_request_id.md
     * @param parentId
     */
    CorrelationIdManager.generateRequestId = function (parentId) {
        if (parentId) {
            parentId = parentId[0] == "|" ? parentId : "|" + parentId;
            if (parentId[parentId.length - 1] !== ".") {
                parentId += ".";
            }
            var suffix = (CorrelationIdManager.currentRootId++).toString(16);
            return CorrelationIdManager.appendSuffix(parentId, suffix, "_");
        }
        else {
            return CorrelationIdManager.generateRootId();
        }
    };
    /**
     * Given a hierarchical identifier of the form |X.*
     * return the root identifier X
     * @param id
     */
    CorrelationIdManager.getRootId = function (id) {
        var endIndex = id.indexOf(".");
        if (endIndex < 0) {
            endIndex = id.length;
        }
        var startIndex = id[0] === "|" ? 1 : 0;
        return id.substring(startIndex, endIndex);
    };
    CorrelationIdManager.generateRootId = function () {
        return "|" + Util.w3cTraceId() + ".";
    };
    CorrelationIdManager.appendSuffix = function (parentId, suffix, delimiter) {
        if (parentId.length + suffix.length < CorrelationIdManager.requestIdMaxLength) {
            return parentId + suffix + delimiter;
        }
        // Combined identifier would be too long, so we must truncate it.
        // We need 9 characters of space: 8 for the overflow ID, 1 for the
        // overflow delimiter '#'
        var trimPosition = CorrelationIdManager.requestIdMaxLength - 9;
        if (parentId.length > trimPosition) {
            for (; trimPosition > 1; --trimPosition) {
                var c = parentId[trimPosition - 1];
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
    };
    CorrelationIdManager.correlationIdPrefix = "cid-v1:";
    CorrelationIdManager.w3cEnabled = true;
    CorrelationIdManager.HTTP_TIMEOUT = 2500; // 2.5 seconds
    CorrelationIdManager.requestIdMaxLength = 1024;
    CorrelationIdManager.currentRootId = Util.randomu32();
    return CorrelationIdManager;
}());
module.exports = CorrelationIdManager;
//# sourceMappingURL=CorrelationIdManager.js.map