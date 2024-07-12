import http = require("http");
import https = require("https");
import { TokenCredential } from "@azure/core-auth";
import { PipelineRequest, PipelineResponse, PipelinePolicy } from "@azure/core-rest-pipeline";
import Logging = require("./Logging");

const applicationInsightsResource = "https://monitor.azure.com//.default";

let azureCore: any;
try {
  azureCore = require("@azure/core-rest-pipeline");
} catch (e) {
  Logging.warn("Cannot load @azure/core-auth package. This package is required for AAD token authentication. It's likely that your node.js version is not supported by the JS Azure SDK.");
}

function emptySendRequest(_request: PipelineRequest): Promise<PipelineResponse> {
  return null;
}
class AuthorizationHandler {

  private _azureTokenPolicy: PipelinePolicy;

  constructor(credential: TokenCredential, aadAudience?: string) {
    if (azureCore) {
      let scopes: string[] = aadAudience ? [aadAudience] : [applicationInsightsResource];
      this._azureTokenPolicy = azureCore.bearerTokenAuthenticationPolicy({ credential, scopes });
    }
  }

  /**
  * Applies the Bearer token to the request through the Authorization header.
  */
  public async addAuthorizationHeader(requestOptions: http.RequestOptions | https.RequestOptions): Promise<void> {
    if (azureCore) {
      let authHeaderName = "authorization";
      let webResource = azureCore.createPipelineRequest({ url: "https://" });
      await this._azureTokenPolicy.sendRequest(webResource, emptySendRequest);
      requestOptions.headers[authHeaderName] = webResource.headers.get(authHeaderName);
    }
  }
}

export = AuthorizationHandler;
