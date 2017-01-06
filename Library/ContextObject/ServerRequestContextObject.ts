/// <reference path="../../typings/globals/node/index.d.ts" />
import http = require("http");

declare class ServerRequestContextObject {
    request: http.ServerRequest;
    response: http.ServerResponse;
}

export = ServerRequestContextObject;
