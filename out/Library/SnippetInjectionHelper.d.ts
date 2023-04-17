/// <reference types="node" />
import zlib = require("zlib");
import http = require("http");
export declare enum contentEncodingMethod {
    GZIP = "gzip",
    DEFLATE = "deflate",
    BR = "br"
}
export declare const bufferEncodingTypes: string[];
export declare const isBrotliSupperted: () => boolean;
export declare const gzipAsync: (arg1: zlib.InputType) => Promise<unknown>;
export declare const gunzipAsync: (arg1: zlib.InputType) => Promise<unknown>;
export declare const deflateAsync: (arg1: zlib.InputType) => Promise<unknown>;
export declare const inflateAsync: (arg1: zlib.InputType) => Promise<unknown>;
export declare const getBrotliCompressAsync: (zlibObject: any) => Function;
export declare const getBrotliCompressSync: (zlibObject: any) => Function;
export declare const getBrotliDecompressAsync: (zlibObject: any) => Function;
export declare const getBrotliDecompressSync: (zlibObject: any) => Function;
export declare const isBufferType: (buffer: Buffer, type?: string) => boolean;
export declare const findBufferEncodingType: (buffer: Buffer) => string;
export declare const isSupportedContentEncoding: (encodingMethod: string) => contentEncodingMethod;
export declare const getContentEncodingFromHeaders: (response: http.ServerResponse) => contentEncodingMethod[];
export declare const insertSnippetByIndex: (index: number, html: string, snippet: string) => string;
export declare const isContentTypeHeaderHtml: (response: http.ServerResponse) => boolean;
