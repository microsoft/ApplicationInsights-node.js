// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import type * as http from 'http';
import type * as https from 'https';
export type Http = typeof http;
import * as semver from 'semver';
import * as url from 'url';
import {
  InstrumentationBase,
  InstrumentationNodeModuleDefinition,
  isWrapped,
  safeExecuteInTheMiddle
} from '@opentelemetry/instrumentation';
import { getRequestInfo } from '@opentelemetry/instrumentation-http';
import { Histogram, MeterProvider, ValueType } from '@opentelemetry/api-metrics';

import { APPLICATION_INSIGHTS_SDK_VERSION } from "../../../declarations/constants";
import { HttpMetricsInstrumentationConfig, IHttpStandardMetric, MetricId, MetricName } from '../types';
import { Logger } from '../../../library/logging';
import { SpanKind, TracerProvider } from '@opentelemetry/api';
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';


export class AzureHttpMetricsInstrumentation extends InstrumentationBase<Http> {

  private _nodeVersion: string;
  public totalRequestCount: number = 0;
  public totalFailedRequestCount: number = 0;
  public totalDependencyCount: number = 0;
  public totalFailedDependencyCount: number = 0;
  public intervalDependencyExecutionTime: number = 0;
  public intervalRequestExecutionTime: number = 0;

  private _httpServerDurationHistogram!: Histogram;
  private _httpClientDurationHistogram!: Histogram;

  constructor(config: HttpMetricsInstrumentationConfig = {}) {
    super('AzureHttpMetricsInstrumentation', APPLICATION_INSIGHTS_SDK_VERSION, config);
    this._nodeVersion = process.versions.node;
    this._updateMetricInstruments();
  }

  public setTracerProvider(tracerProvider: TracerProvider) { }

  public setMeterProvider(meterProvider: MeterProvider) {
    super.setMeterProvider(meterProvider);
    this._updateMetricInstruments();
  }

  private _updateMetricInstruments() {
    this._httpServerDurationHistogram = this.meter.createHistogram(MetricName.REQUEST_DURATION, { valueType: ValueType.DOUBLE });
    this._httpClientDurationHistogram = this.meter.createHistogram(MetricName.DEPENDENCY_DURATION, { valueType: ValueType.DOUBLE });
  }

  public _getConfig(): HttpMetricsInstrumentationConfig {
    return this._config;
  }

  /**
   * Init method will be called when the plugin is constructed.
   * It returns an `InstrumentationNodeModuleDefinition` which describes
   *   the node module to be instrumented and patched.
   * It may also return a list of `InstrumentationNodeModuleDefinition`s if
   *   the plugin should patch multiple modules or versions.
   */
  protected init() {
    return [this._getHttpDefinition(), this._getHttpsDefinition()];
  }

  private _httpRequestDone(metric: IHttpStandardMetric) {
    // Done could be called multiple times, only process metric once
    if (!metric.isProcessed) {
      metric.isProcessed = true;
      metric.attributes["_MS.IsAutocollected"] = "True";
      let durationMs = Date.now() - metric.startTime;
      let success = false;
      const statusCode = parseInt(String(metric.attributes[SemanticAttributes.HTTP_STATUS_CODE]));
      if (statusCode !== NaN) {
        success = (0 < statusCode) && (statusCode < 500);
      }
      if (metric.spanKind == SpanKind.SERVER) {
        metric.attributes["_MS.MetricId"] = MetricId.REQUESTS_DURATION;
        this._httpServerDurationHistogram.record(durationMs, metric.attributes);
        this.intervalRequestExecutionTime += durationMs;
        if (!success) {
          this.totalFailedRequestCount++;
        }
        this.totalRequestCount++;
      }
      else {
        metric.attributes["_MS.MetricId"] = MetricId.DEPENDENCIES_DURATION;
        this._httpClientDurationHistogram.record(durationMs, metric.attributes);
        this.intervalDependencyExecutionTime += durationMs;
        if (!success) {
          this.totalFailedDependencyCount++;
        }
        this.totalDependencyCount++;
      }
    }
  }

  private _getHttpDefinition(): InstrumentationNodeModuleDefinition<typeof http> {
    const httpsModule = new InstrumentationNodeModuleDefinition<typeof http>(
      'http',
      ['*'],
      moduleExports => {
        this._diag.debug(`Applying patch for http@${this._nodeVersion}`);
        if (isWrapped(moduleExports.request)) {
          this._unwrap(moduleExports, 'request');
        }
        this._wrap(
          moduleExports,
          'request',
          this._getPatchOutgoingRequestFunction('http')
        );
        if (isWrapped(moduleExports.Server.prototype.emit)) {
          this._unwrap(moduleExports.Server.prototype, 'emit');
        }
        this._wrap(
          moduleExports.Server.prototype,
          'emit',
          this._getPatchIncomingRequestFunction('http')
        );
        return moduleExports;
      },
      moduleExports => {
        if (moduleExports === undefined) return;
        this._diag.debug(`Removing patch for http@${this._nodeVersion}`);

        this._unwrap(moduleExports, 'request');
        this._unwrap(moduleExports.Server.prototype, 'emit');
      }
    );
    return httpsModule;
  }

  private _getHttpsDefinition(): InstrumentationNodeModuleDefinition<typeof https> {
    const httpsModule = new InstrumentationNodeModuleDefinition<typeof https>(
      'https',
      ['*'],
      moduleExports => {
        this._diag.debug(`Applying patch for https@${this._nodeVersion}`);
        if (isWrapped(moduleExports.request)) {
          this._unwrap(moduleExports, 'request');
        }
        this._wrap(
          moduleExports,
          'request',
          this._getPatchOutgoingRequestFunction('https')
        );
        if (isWrapped(moduleExports.Server.prototype.emit)) {
          this._unwrap(moduleExports.Server.prototype, 'emit');
        }
        this._wrap(
          moduleExports.Server.prototype,
          'emit',
          this._getPatchIncomingRequestFunction('https')
        );
        return moduleExports;
      },
      moduleExports => {
        if (moduleExports === undefined) return;
        this._diag.debug(`Removing patch for https@${this._nodeVersion}`);

        this._unwrap(moduleExports, 'request');
        this._unwrap(moduleExports.Server.prototype, 'emit');
      }
    );
    return httpsModule;
  }

  private _getPatchOutgoingRequestFunction(component: 'http' | 'https') {
    return (original: (...args: any[]) => http.ClientRequest): (...args: any[]) => http.ClientRequest => {
      return this._outgoingRequestFunction(component, original);
    };
  }

  private _outgoingRequestFunction(
    component: 'http' | 'https',
    original: (...args: any[]) => http.ClientRequest
  ): (...args: any[]) => http.ClientRequest {
    const instrumentation = this;
    return function outgoingRequest(
      this: unknown,
      options: url.URL | http.RequestOptions | string,
      ...args: unknown[]
    ): http.ClientRequest {
      /**
       * Node 8's https module directly call the http one so to avoid creating
       * 2 span for the same request we need to check that the protocol is correct
       * See: https://github.com/nodejs/node/blob/v8.17.0/lib/https.js#L245
       */
      const { optionsParsed } = getRequestInfo(options);
      if (
        component === 'http' &&
        semver.lt(process.version, '9.0.0') &&
        optionsParsed.protocol === 'https:'
      ) {
        return original.apply(this, [options, ...args]);
      }
      if (safeExecuteInTheMiddle(
        () => instrumentation._getConfig().ignoreOutgoingRequestHook?.(optionsParsed),
        (e: unknown) => {
          if (e != null) {
            instrumentation._diag.error('caught ignoreOutgoingRequestHook error: ', e);
          }
        },
        true
      )) {
        return original.apply(this, [optionsParsed, ...args]);
      }

      let metric: IHttpStandardMetric = {
        startTime: Date.now(),
        isProcessed: false,
        spanKind: SpanKind.CLIENT,
        attributes: {}
      };

      metric.attributes[SemanticAttributes.HTTP_METHOD] = optionsParsed.method;
      metric.attributes[SemanticAttributes.NET_PEER_NAME] = optionsParsed.hostname;

      const request: http.ClientRequest = safeExecuteInTheMiddle(
        () => original.apply(this, [options, ...args]),
        error => {
          if (error) {
            throw error;
          }
        }
      );
      request.prependListener(
        'response',
        (response: http.IncomingMessage & { aborted?: boolean, complete?: boolean }) => {
          Logger.getInstance().debug('outgoingRequest on response()');
          metric.attributes[SemanticAttributes.NET_PEER_PORT] = String(response.socket.remotePort);
          metric.attributes[SemanticAttributes.HTTP_STATUS_CODE] = String(response.statusCode);
          metric.attributes[SemanticAttributes.HTTP_FLAVOR] = response.httpVersion;

          response.on('end', () => {
            Logger.getInstance().debug('outgoingRequest on end()');
            instrumentation._httpRequestDone(metric);
          });
          response.on('error', (error: Error) => {
            Logger.getInstance().debug('outgoingRequest on response error()', error);
            instrumentation._httpRequestDone(metric);
          });
        }
      );
      request.on('close', () => {
        Logger.getInstance().debug('outgoingRequest on request close()');
        if (!request.aborted) {
          instrumentation._httpRequestDone(metric);
        }
      });
      request.on('error', (error: Error) => {
        Logger.getInstance().debug('outgoingRequest on request error()');
        instrumentation._httpRequestDone(metric);
      });
      return request;
    };
  }

  private _getPatchIncomingRequestFunction(component: 'http' | 'https') {
    return (original: (event: string, ...args: unknown[]) => boolean): (this: unknown, event: string, ...args: unknown[]) => boolean => {
      return this._incomingRequestFunction(component, original);
    };
  }

  private _incomingRequestFunction(
    component: 'http' | 'https',
    original: (event: string, ...args: unknown[]) => boolean
  ) {
    const instrumentation = this;
    return function incomingRequest(
      this: unknown,
      event: string,
      ...args: unknown[]
    ): boolean {
      // Only count request events
      if (event !== 'request') {
        return original.apply(this, [event, ...args]);
      }
      const request = args[0] as http.IncomingMessage;
      const response = args[1] as http.ServerResponse;

      if (safeExecuteInTheMiddle(
        () => instrumentation._getConfig().ignoreIncomingRequestHook?.(request),
        (e: unknown) => {
          if (e != null) {
            instrumentation._diag.error('caught ignoreIncomingRequestHook error: ', e);
          }
        },
        true
      )) {
        return original.apply(this, [event, ...args]);
      }

      let metric: IHttpStandardMetric = {
        startTime: Date.now(),
        spanKind: SpanKind.SERVER,
        isProcessed: false,
        attributes: {}
      };

      metric.attributes[SemanticAttributes.HTTP_SCHEME] = component;
      metric.attributes[SemanticAttributes.HTTP_METHOD] = request.method || 'GET';
      metric.attributes[SemanticAttributes.HTTP_FLAVOR] = request.httpVersion;

      const requestUrl = request.url ? url.parse(request.url) : null;
      const hostname =
        requestUrl?.hostname ||
        requestUrl?.host?.replace(/^(.*)(:[0-9]{1,5})/, '$1') ||
        'localhost';
      metric.attributes[SemanticAttributes.NET_HOST_NAME] = hostname;
      metric.attributes[SemanticAttributes.HTTP_TARGET] = requestUrl.pathname || '/';

      const originalEnd = response.end;
      response.end = function (
        this: http.ServerResponse,
        ..._args: any
      ) {
        response.end = originalEnd;
        const returned = safeExecuteInTheMiddle(
          () => response.end.apply(this, arguments as never),
          error => {
            if (error) {
              instrumentation._httpRequestDone(metric);
              throw error;
            }
          }
        );
        metric.attributes[SemanticAttributes.HTTP_STATUS_CODE] = String(response.statusCode);
        metric.attributes[SemanticAttributes.NET_HOST_PORT] = String(request.socket.localPort);
        instrumentation._httpRequestDone(metric);
        return returned;
      };
      return safeExecuteInTheMiddle(
        () => original.apply(this, [event, ...args]),
        error => {
          if (error) {
            instrumentation._httpRequestDone(metric);
            throw error;
          }
        }
      );
    };
  }

}
