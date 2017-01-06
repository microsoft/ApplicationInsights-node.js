/// <reference path="../../typings/globals/node/index.d.ts" />
import http = require("http");

declare class ClientRequestContextObject {
    requestOptions: http.RequestOptions;
    request: http.ClientRequest;
    response: http.ClientResponse;
    error: Error;
}

export = ClientRequestContextObject;
