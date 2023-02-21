import http = require("http");
import https = require("https");
import azureCoreAuth = require("@azure/core-auth");
import azureCore = require("@azure/core-rest-pipeline");

const applicationInsightsResource = "https://monitor.azure.com//.default";


function emptySendRequest(_request: azureCore.PipelineRequest): Promise<azureCore.PipelineResponse> {
  return null;
}

class AuthorizationHandler {

  private _azureTokenPolicy: azureCore.PipelinePolicy;

  constructor(credential: azureCoreAuth.TokenCredential) {
    let scopes: string[] = [applicationInsightsResource];
    this._azureTokenPolicy = azureCore.bearerTokenAuthenticationPolicy({ credential, scopes });
  }

  /**
  * Applies the Bearer token to the request through the Authorization header.
  */
  public async addAuthorizationHeader(requestOptions: http.RequestOptions | https.RequestOptions): Promise<void> {
    let authHeaderName = "authorization";
    let webResource = azureCore.createPipelineRequest({ url: "https://" });
    await this._azureTokenPolicy.sendRequest(webResource, emptySendRequest);
    requestOptions.headers[authHeaderName] = webResource.headers.get(authHeaderName);
  }
}

export = AuthorizationHandler;
