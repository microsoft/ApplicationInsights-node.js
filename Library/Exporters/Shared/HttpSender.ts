// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as url from "url";
import { FullOperationResponse } from "@azure/core-client";
import { bearerTokenAuthenticationPolicy, redirectPolicyName } from "@azure/core-rest-pipeline";
import { ISender, SenderResult } from "../../../Declarations/Types";
import {
  TelemetryItem as Envelope,
  ApplicationInsightsClient,
  ApplicationInsightsClientOptionalParams,
  TrackOptionalParams,
} from "../../../Declarations//Generated";
import { IAzureExporterInternalConfig } from "../../../Declarations/Config";

const applicationInsightsResource = "https://monitor.azure.com//.default";

/**
 * Exporter HTTP sender class
 * @internal
 */
export class HttpSender implements ISender {
  private readonly _appInsightsClient: ApplicationInsightsClient;
  private _appInsightsClientOptions: ApplicationInsightsClientOptionalParams;

  constructor(private _exporterOptions: IAzureExporterInternalConfig) {
    // Build endpoint using provided configuration or default values
    this._appInsightsClientOptions = {
      host: this._exporterOptions.endpointUrl,
    };

    this._appInsightsClient = new ApplicationInsightsClient({
      ...this._appInsightsClientOptions,
    });

    this._appInsightsClient.pipeline.removePolicy({ name: redirectPolicyName });
    if (this._exporterOptions.aadTokenCredential) {
      let scopes: string[] = [applicationInsightsResource];
      this._appInsightsClient.pipeline.addPolicy(
        bearerTokenAuthenticationPolicy({
          credential: this._exporterOptions.aadTokenCredential,
          scopes: scopes,
        })
      );
    }
  }

  /**
   * Send Azure envelopes
   * @internal
   */
  public async send(envelopes: Envelope[]): Promise<SenderResult> {
    let options: TrackOptionalParams = {};
    try {
      let response: FullOperationResponse | undefined;
      let onResponse = (rawResponse: FullOperationResponse, flatResponse: unknown) => {
        response = rawResponse;
        if (options.onResponse) {
          options.onResponse(rawResponse, flatResponse);
        }
      }
      await this._appInsightsClient.track(envelopes, {
        ...options,
        onResponse,
      });

      return { statusCode: response?.status, result: response?.bodyAsText ?? "" };
    } catch (e) {
      throw e;
    }
  }

  /**
   * Shutdown sender
   * @internal
   */
  public async shutdown(): Promise<void> {

  }

  public handlePermanentRedirect(location: string | undefined) {
    if (location) {
      const locUrl = new url.URL(location);
      if (locUrl && locUrl.host) {
        this._appInsightsClient.host = "https://" + locUrl.host;
      }
    }
  }
}
