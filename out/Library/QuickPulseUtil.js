"use strict";
/**
 * @description UTC time the request was made. Expressed as the number of 100-nanosecond intervals that have elapsed since 12:00:00 midnight on January 1, 0001. This is used for clock skew calculations, so the value can never be stale (cached).
 *
 * @example
 * 8/5/2020 10:15:00 PM UTC => 637322625000000000
 * 8/5/2020 10:15:01 PM UTC => 637322625010000000
 *
 * @returns {number}
 */
var getTransmissionTime = function () {
    return (Date.now() + 62135596800000) * 10000;
};
module.exports = { getTransmissionTime: getTransmissionTime };
//# sourceMappingURL=QuickPulseUtil.js.map