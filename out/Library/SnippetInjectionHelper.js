"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isContentTypeHeaderHtml = exports.insertSnippetByIndex = exports.getContentEncodingFromHeaders = exports.isSupportedContentEncoding = exports.findBufferEncodingType = exports.isBufferType = exports.getBrotliDecompressSync = exports.getBrotliDecompressAsync = exports.getBrotliCompressSync = exports.getBrotliCompressAsync = exports.inflateAsync = exports.deflateAsync = exports.gunzipAsync = exports.gzipAsync = exports.isBrotliSupperted = exports.bufferEncodingTypes = exports.contentEncodingMethod = void 0;
var zlib = require("zlib");
var util_1 = require("util");
// currently support the following encoding types
var contentEncodingMethod;
(function (contentEncodingMethod) {
    contentEncodingMethod["GZIP"] = "gzip";
    contentEncodingMethod["DEFLATE"] = "deflate";
    contentEncodingMethod["BR"] = "br";
})(contentEncodingMethod = exports.contentEncodingMethod || (exports.contentEncodingMethod = {}));
//current supported encoding types
exports.bufferEncodingTypes = ["utf8", "utf16le", "latin1", "base64", "hex", "ascii", "binary", "ucs2"];
//for node version under 10, Brotli compression is not supported.
var isBrotliSupperted = function () {
    var majVer = process.versions.node.split(".")[0];
    return parseInt(majVer) >= 10;
};
exports.isBrotliSupperted = isBrotliSupperted;
exports.gzipAsync = util_1.promisify(zlib.gzip);
exports.gunzipAsync = util_1.promisify(zlib.gunzip);
exports.deflateAsync = util_1.promisify(zlib.deflate);
exports.inflateAsync = util_1.promisify(zlib.inflate);
var getBrotliCompressAsync = function (zlibObject) {
    var isMajorVer = exports.isBrotliSupperted();
    if (isMajorVer && typeof zlibObject.brotliCompress === "function") {
        return util_1.promisify(zlibObject.brotliCompress);
    }
    return null;
};
exports.getBrotliCompressAsync = getBrotliCompressAsync;
var getBrotliCompressSync = function (zlibObject) {
    var isMajorVer = exports.isBrotliSupperted();
    if (isMajorVer && typeof zlibObject.brotliCompressSync === "function") {
        return zlibObject.brotliCompressSync;
    }
    return null;
};
exports.getBrotliCompressSync = getBrotliCompressSync;
var getBrotliDecompressAsync = function (zlibObject) {
    var isMajorVer = exports.isBrotliSupperted();
    if (isMajorVer && typeof zlibObject.brotliDecompress === "function") {
        return util_1.promisify(zlibObject.brotliDecompress);
    }
    return null;
};
exports.getBrotliDecompressAsync = getBrotliDecompressAsync;
var getBrotliDecompressSync = function (zlibObject) {
    var isMajorVer = exports.isBrotliSupperted();
    if (isMajorVer && typeof zlibObject.brotliDecompressSync === "function") {
        return zlibObject.brotliDecompressSync;
    }
    return null;
};
exports.getBrotliDecompressSync = getBrotliDecompressSync;
var isBufferType = function (buffer, type) {
    var encodingType = type ? type : "utf8";
    var result = false;
    if (Buffer.isEncoding(encodingType)) {
        var newBuffer = Buffer.from(buffer.toString(encodingType), encodingType);
        result = newBuffer.toJSON().data.toString() === buffer.toJSON().data.toString();
    }
    return result;
};
exports.isBufferType = isBufferType;
var findBufferEncodingType = function (buffer) {
    var bufferType = null;
    for (var key in exports.bufferEncodingTypes) {
        var type = exports.bufferEncodingTypes[key];
        if (Buffer.isEncoding(type) && exports.isBufferType(buffer, type)) {
            bufferType = type;
            break;
        }
    }
    return bufferType;
};
exports.findBufferEncodingType = findBufferEncodingType;
var isSupportedContentEncoding = function (encodingMethod) {
    var encodingType = null;
    switch (encodingMethod) {
        case "gzip":
            encodingType = contentEncodingMethod.GZIP;
            break;
        case "br":
            encodingType = contentEncodingMethod.BR;
            break;
        case "deflate":
            encodingType = contentEncodingMethod.DEFLATE;
            break;
        default:
    }
    return encodingType;
};
exports.isSupportedContentEncoding = isSupportedContentEncoding;
// mutiple content-encoding is not supported
// for mutiple content-encoding, this method will return any empty array
var getContentEncodingFromHeaders = function (response) {
    var headers = [];
    var contentEncodingHeaders = response.getHeader("Content-Encoding");
    if (!contentEncodingHeaders)
        return null;
    if (typeof contentEncodingHeaders === "string") {
        var supportedContentEncoding = exports.isSupportedContentEncoding(contentEncodingHeaders);
        if (supportedContentEncoding) {
            headers.push(supportedContentEncoding);
        }
    }
    return headers;
};
exports.getContentEncodingFromHeaders = getContentEncodingFromHeaders;
var insertSnippetByIndex = function (index, html, snippet) {
    if (index < 0)
        return null;
    var newHtml = null;
    var subStart = html.substring(0, index);
    var subEnd = html.substring(index);
    newHtml = subStart + "<script type=\"text/javascript\">" + snippet + "</script>" + subEnd;
    return newHtml;
};
exports.insertSnippetByIndex = insertSnippetByIndex;
var isContentTypeHeaderHtml = function (response) {
    var isHtml = false;
    var contentType = response.getHeader("Content-Type");
    if (contentType) {
        if (typeof contentType === "string") {
            isHtml = contentType.indexOf("html") >= 0;
        }
        else {
            isHtml = contentType.toString().indexOf("html") >= 0;
        }
    }
    return isHtml;
};
exports.isContentTypeHeaderHtml = isContentTypeHeaderHtml;
//# sourceMappingURL=SnippetInjectionHelper.js.map