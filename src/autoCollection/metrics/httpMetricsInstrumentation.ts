// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import type * as http from 'http';
import type * as https from 'https';
import * as semver from 'semver';
import * as url from 'url';
import {
  InstrumentationBase,
  InstrumentationConfig,
  InstrumentationNodeModuleDefinition,
  isWrapped,
  safeExecuteInTheMiddle
} from '@opentelemetry/instrumentation';
import { getRequestInfo } from '@opentelemetry/instrumentation-http';
import { Histogram } from "@opentelemetry/api-metrics";

import { APPLICATION_INSIGHTS_SDK_VERSION } from "../../declarations/constants";
import { IHttpMetric, IMetricDependencyDimensions, IMetricRequestDimensions, MetricDependencyType, StandardMetric } from './types';
import { Logger } from '../../library/logging';
import { getMetricAttributes } from './util';


export class HttpMetricsInstrumentation extends InstrumentationBase {

  private static _instance: HttpMetricsInstrumentation;
  private _nodeVersion: string;
  public totalRequestCount: number = 0;
  public totalFailedRequestCount: number = 0;
  public totalDependencyCount: number = 0;
  public totalFailedDependencyCount: number = 0;
  public intervalDependencyExecutionTime: number = 0;
  public intervalRequestExecutionTime: number = 0;

  private _requestsDurationHistogram: Histogram = null;
  private _dependenciesDurationHistogram: Histogram = null;

  public static getInstance() {
    if (!HttpMetricsInstrumentation._instance) {
      HttpMetricsInstrumentation._instance = new HttpMetricsInstrumentation();
    }
    return HttpMetricsInstrumentation._instance;
  }

  constructor(config: InstrumentationConfig = {}) {
    super('AzureHttpMetricsInstrumentation', APPLICATION_INSIGHTS_SDK_VERSION, config);
    this._nodeVersion = process.versions.node;
  }

  public enableStandardMetrics(requestsDurationHistogram: Histogram, dependenciesDurationHistogram: Histogram) {
    this._dependenciesDurationHistogram = dependenciesDurationHistogram;
    this._requestsDurationHistogram = requestsDurationHistogram;
  }

  public disableStandardMetrics() {
    this._dependenciesDurationHistogram = null;
    this._requestsDurationHistogram = null;
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

  private _httpRequestDone(metric: IHttpMetric) {
    // Done could be called multiple times, only process metric once
    if (!metric.isProcessed) {
      let durationMs = Date.now() - metric.startTime;
      let attributes = getMetricAttributes(metric.dimensions);
      if (metric.isOutgoingRequest) {
        if (this._requestsDurationHistogram) {
          this._requestsDurationHistogram.record(durationMs, attributes);
        }
        this.intervalRequestExecutionTime += durationMs;
        if (metric.dimensions.success === false) {
          this.totalFailedRequestCount++;
        }
        this.totalRequestCount++;
      }
      else {
        if (this._dependenciesDurationHistogram) {
          this._dependenciesDurationHistogram.record(durationMs, attributes);
        }
        this.intervalDependencyExecutionTime += durationMs;
        if (metric.dimensions.success === false) {
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
      const { origin, pathname, method, optionsParsed } = getRequestInfo(options);
      if (
        component === 'http' &&
        semver.lt(process.version, '9.0.0') &&
        optionsParsed.protocol === 'https:'
      ) {
        return original.apply(this, [options, ...args]);
      }
      let dimensions: IMetricDependencyDimensions = {
        success: false,
        type: MetricDependencyType.HTTP,
        target: optionsParsed.path || '/'
      };
      let metric: IHttpMetric = {
        startTime: Date.now(),
        isOutgoingRequest: true,
        isProcessed: false,
        dimensions: dimensions
      };
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
          metric.dimensions.resultCode = String(response.statusCode);
          response.on('end', () => {
            Logger.getInstance().debug('outgoingRequest on end()');
            if (response.aborted && !response.complete) {
              metric.dimensions.success = false;
            } else {
              metric.dimensions.success = (0 < response.statusCode) && (response.statusCode < 400);
            }
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
        metric.dimensions.success = false;
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
      let dimensions: IMetricRequestDimensions = {
        success: false,
      };
      let metric: IHttpMetric = {
        startTime: Date.now(),
        isOutgoingRequest: false,
        isProcessed: false,
        dimensions: dimensions
      };
      const request = args[0] as http.IncomingMessage;
      const response = args[1] as http.ServerResponse;
      const originalEnd = response.end;
      response.end = function (
        this: http.ServerResponse,
        ..._args: any
      ) {
        response.end = originalEnd;
        metric.dimensions.resultCode = String(response.statusCode);
        metric.dimensions.success = (0 < response.statusCode) && (response.statusCode < 500);
        const returned = safeExecuteInTheMiddle(
          () => response.end.apply(this, arguments as never),
          error => {
            if (error) {
              instrumentation._httpRequestDone(metric);
              throw error;
            }
          }
        );
        instrumentation._httpRequestDone(metric);
        return returned;
      };
      return safeExecuteInTheMiddle(
        () => original.apply(this, [event, ...args]),
        error => {
          if (error) {
            metric.dimensions.resultCode = String(response.statusCode);
            metric.dimensions.success = false;
            instrumentation._httpRequestDone(metric);
            throw error;
          }
        }
      );
    };
  }
}
