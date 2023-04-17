"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
// THIS FILE WAS AUTOGENERATED
var Domain = require("./Domain");
"use strict";
/**
 * An instance of Request represents completion of an external request to the application to do work and contains a summary of that request execution and the results.
 */
var RequestData = /** @class */ (function (_super) {
    __extends(RequestData, _super);
    function RequestData() {
        var _this = _super.call(this) || this;
        _this.ver = 2;
        _this.properties = {};
        _this.measurements = {};
        return _this;
    }
    return RequestData;
}(Domain));
module.exports = RequestData;
//# sourceMappingURL=RequestData.js.map