import http = require("http");
import https = require("https");
import azureCore = require("@azure/core-http");

const applicationInsightsResource = "https://monitor.azure.com//.default";


class AuthorizationHandler {

    private _azureTokenPolicy: azureCore.RequestPolicy;

    constructor(credential: azureCore.TokenCredential) {
        let scopes: string[] = [applicationInsightsResource];
        let emptyPolicy: azureCore.RequestPolicy = {
            sendRequest(httpRequest: azureCore.WebResourceLike): Promise<azureCore.HttpOperationResponse> {
                return null;
            }
        };
        this._azureTokenPolicy = azureCore.bearerTokenAuthenticationPolicy(credential, scopes).create(emptyPolicy, new azureCore.RequestPolicyOptions());
    }

    /**
    * Applies the Bearer token to the request through the Authorization header.
    */
    public async addAuthorizationHeader(requestOptions: http.RequestOptions | https.RequestOptions): Promise<void> {
        let authHeaderName = azureCore.Constants.HeaderConstants.AUTHORIZATION;
        let webResource = new azureCore.WebResource("https://");
        this
        await this._azureTokenPolicy.sendRequest(webResource);
        requestOptions.headers[authHeaderName] = webResource.headers.get(authHeaderName);
    }

}

export = AuthorizationHandler;