"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.domainSupportsProperties = exports.RemoteDependencyDataConstants = void 0;
var Generated_1 = require("./Generated");
var RemoteDependencyDataConstants = /** @class */ (function () {
    function RemoteDependencyDataConstants() {
    }
    RemoteDependencyDataConstants.TYPE_HTTP = "Http";
    RemoteDependencyDataConstants.TYPE_AI = "Http (tracked component)";
    return RemoteDependencyDataConstants;
}());
exports.RemoteDependencyDataConstants = RemoteDependencyDataConstants;
function domainSupportsProperties(domain) {
    return "properties" in domain || // Do extra typechecks in case the type supports it but properties is null/undefined
        domain instanceof Generated_1.EventData ||
        domain instanceof Generated_1.ExceptionData ||
        domain instanceof Generated_1.MessageData ||
        domain instanceof Generated_1.MetricData ||
        domain instanceof Generated_1.PageViewData ||
        domain instanceof Generated_1.RemoteDependencyData ||
        domain instanceof Generated_1.RequestData;
}
exports.domainSupportsProperties = domainSupportsProperties;
//# sourceMappingURL=Constants.js.map