/// <reference types="node" />
import http = require("http");
import https = require("https");
import azureCoreAuth = require("@azure/core-auth");
declare class AuthorizationHandler {
    private _azureTokenPolicy;
    constructor(credential: azureCoreAuth.TokenCredential);
    /**
    * Applies the Bearer token to the request through the Authorization header.
    */
    addAuthorizationHeader(requestOptions: http.RequestOptions | https.RequestOptions): Promise<void>;
}
export = AuthorizationHandler;
