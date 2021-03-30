import http = require("http");
import https = require("https");
import azureCore = require("@azure/core-http");
import azureIdentity = require("@azure/identity");

import Config = require("./Config");

/**
 * The automated token refresh will only start to happen at the
 * expiration date minus the value of timeBetweenRefreshAttemptsInMs,
 * which is by default 30 seconds.
 */
const timeBetweenRefreshAttemptsInMs = 30000;

const applicationInsightsResource = "https://monitor.azure.com";

class AuthorizationOptions {
    appId?: string = "";
    tenantId?: string = "";
    certificateThumbprint?: string = "";
    certificateSubjectName?: string = "";
    certificateStoreLocation?: string = "";
    appKey?: string = "";

    public isCertAuth(): boolean {
        return this.appId != "" && this.tenantId != "" && this.certificateStoreLocation != "" &&
            (this.certificateThumbprint != "" || this.certificateSubjectName != "");
    }

    public isSecretAuth(): boolean {
        return this.appId != "" && this.tenantId != "" && this.appKey != "";
    }

    public isManagedIdentityAuth(): boolean {
        return this.appId != "";
    }
}

class AuthHandler {

    private _tokenCache: azureCore.AccessTokenCache;
    private _tokenRefresher: azureCore.AccessTokenRefresher;

    constructor(config: Config) {
        let credential: azureCore.TokenCredential;

        let authOptions = new AuthorizationOptions();
        authOptions.appId = config.authAppId ? config.authAppId : "";
        authOptions.tenantId = config.authTenantId ? config.authTenantId : "";
        authOptions.certificateThumbprint = config.authCertificateThumbprint ? config.authCertificateThumbprint : "";
        authOptions.certificateSubjectName = config.authCertificateSubjectName ? config.authCertificateSubjectName : "";
        authOptions.certificateStoreLocation = config.authCertificateStoreLocation ? config.authCertificateStoreLocation : "";
        authOptions.appKey = config.authAppKey ? config.authAppKey : "";

        if (authOptions.isManagedIdentityAuth()) {
            credential = new azureIdentity.ManagedIdentityCredential(authOptions.appId);
        }
        else {
            credential = new azureIdentity.DefaultAzureCredential();
        }

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
        requestOptions.headers[azureCore.Constants.HeaderConstants.AUTHORIZATION] = `Bearer ${token}`;
    }

    private async _getToken(options: azureCore.GetTokenOptions): Promise<string | undefined> {
        // We reset the cached token some before it expires,
        // after that point, we retry the refresh of the token only if the token refresher is ready.
        let token = this._tokenCache.getCachedToken();
        if (!token && this._tokenRefresher.isReady()) {
            token = await this._tokenRefresher.refresh(options);
            this._tokenCache.setCachedToken(token);
        }
        return token ? token.token : undefined;
    }
}

export = AuthHandler;
