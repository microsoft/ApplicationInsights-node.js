import http = require("http");
import https = require("https");
import azureCore = require("@azure/core-http");

/**
 * The automated token refresh will only start to happen at the
 * expiration date minus the value of timeBetweenRefreshAttemptsInMs,
 * which is by default 30 seconds.
 */
const timeBetweenRefreshAttemptsInMs = 30000;

const applicationInsightsResource = "https://monitor.azure.com";


class AuthorizationHandler {

    private _tokenCache: azureCore.AccessTokenCache;
    private _tokenRefresher: azureCore.AccessTokenRefresher;

    constructor(credential: azureCore.TokenCredential) {
        let scopes: string[] = [applicationInsightsResource];
        this._tokenCache = new azureCore.ExpiringAccessTokenCache();
        this._tokenRefresher = new azureCore.AccessTokenRefresher(
            credential,
            scopes,
            timeBetweenRefreshAttemptsInMs
        );
    }

    /**
       * Applies the Bearer token to the request through the Authorization header.
       */
    public async addAuthorizationHeader(requestOptions: http.RequestOptions | https.RequestOptions): Promise<void> {
        const token = await this._getToken({});
        if (token) {
            requestOptions.headers[azureCore.Constants.HeaderConstants.AUTHORIZATION] = `Bearer ${token}`;
        }
    }

    private async _getToken(options: azureCore.GetTokenOptions): Promise<string | undefined> {
        // We reset the cached token some before it expires,
        // after that point, we retry the refresh of the token only if the token refresher is ready.
        let cachedToken = this._tokenCache.getCachedToken();
        if (!cachedToken && this._tokenRefresher.isReady()) {
            cachedToken = await this._tokenRefresher.refresh(options);
            this._tokenCache.setCachedToken(cachedToken);
        }
        return cachedToken ? cachedToken.token : undefined;
    }
}

export = AuthorizationHandler;
