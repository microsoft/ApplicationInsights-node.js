import path = require("path");
import zlib = require("zlib");
import { promisify } from "util";
import http = require("http");

// currently support the following encoding types
export enum contentEncodingMethod {
    GZIP = "gzip",
    DEFLATE = "deflate",
    BR = "br"
}

export const bufferEncodingTypes = ["utf8","utf16le","latin1","base64","hex","base64url","ascii","binary","ucs2"];

//for node version under 10, Brotli compression is not supported.
export const isBrotliSupperted = (): boolean => {
    const majVer = process.versions.node.split(".")[0];
    return parseInt(majVer) >= 10;
}

export const gzipAsync = promisify(zlib.gzip);
export const gunzipAsync = promisify(zlib.gunzip);
export const deflateAsync = promisify(zlib.deflate);
export const inflateAsync = promisify(zlib.inflate);

export const getBrotliCompressAsync = (zlibObject: any): Function => {
    let isMajorVer = isBrotliSupperted();
    if (isMajorVer && typeof zlibObject.brotliCompress === "function") {
        return promisify(zlibObject.brotliCompress);
    }
    return null;
}

export const getBrotliCompressSync = (zlibObject: any): Function => {
    let isMajorVer = isBrotliSupperted();
    if (isMajorVer && typeof zlibObject.brotliCompressSync === "function") {
        return zlibObject.brotliCompressSync;
    }
    return null;
}

export const getBrotliDecompressAsync = (zlibObject: any): Function => {
    let isMajorVer = isBrotliSupperted();
    if (isMajorVer && typeof zlibObject.brotliDecompress === "function") {
        return promisify(zlibObject.brotliDecompress);
    }
    return null;
}

export const getBrotliDecompressSync = (zlibObject: any): Function => {
    let isMajorVer = isBrotliSupperted();
    if (isMajorVer && typeof zlibObject.brotliDecompressSync === "function") {
        return zlibObject.brotliDecompressSync;
    }
    return null;
}

export const isBufferType = (buffer: Buffer, type:string): boolean => {
    let newBuffer = Buffer.from(buffer.toString(type),type);
    let result = newBuffer.toJSON().data.toString() === buffer.toJSON().data.toString();
    return result;
}

export const findBufferEncodingType = (buffer: Buffer): string =>  {
    let bufferType = null;
    for (let type in bufferEncodingTypes) {
        if (!Buffer.isEncoding(type)) {
            continue;
        }
        if (isBufferType(buffer, type)) {
            bufferType = type;
            break;
        }
    }
    return bufferType;
}

export const isSupportedContentEncoding = (encodingMethod: string): contentEncodingMethod => {
    let encodingType = null;
    switch (encodingMethod) {
        case "gzip":
            encodingType = contentEncodingMethod.GZIP;
            break;
        case "br":
            encodingType = contentEncodingMethod.BR;
            break;
        case "deflate":
            contentEncodingMethod.DEFLATE;
            break;
    }
    return encodingType;
}

// mutiple content-encoding is not supported
// for mutiple content-encoding, this method will return any empty array
export const getContentEncodingFromHeaders = (response: http.ServerResponse): contentEncodingMethod[] => {
    let headers: contentEncodingMethod[] = [];
    let contentEncodingHeaders = response.getHeader('Content-Encoding');
    if (!!contentEncodingHeaders) return null;
    if (typeof contentEncodingHeaders === "string") {
        let supportedContentEncoding = isSupportedContentEncoding(contentEncodingHeaders);
        if (supportedContentEncoding) headers = [supportedContentEncoding];
    }
    return headers;
}

export const insertSnippetByIndex = (index: number, html: string, snippet: string): string => {
    if (index < 0) return null;
    let newHtml = null;
    let subStart = html.substring(0, index);
    let subEnd = html.substring(index);
    newHtml = subStart + '<script type="text/javascript">' + snippet + '</script>' + subEnd;
    return newHtml;
}

export const isContentTypeHeaderHtml = (response: http.ServerResponse): boolean => {
    let isHtml = false;
    let contentType = response.getHeader("Content-Type");
    if (typeof contentType === "string") {
        isHtml = contentType.indexOf("html") >= 0;
    } else {
        isHtml = contentType.toString().indexOf("html") >= 0;
    }
    return isHtml;
}