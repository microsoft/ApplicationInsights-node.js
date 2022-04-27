// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import { LogHandler } from "../../library/handlers/logHandler";
import { StatsbeatInstrumentation } from "../../declarations/constants";
import { KnownSeverityLevel } from "../../declarations/generated";

import { channel, IStandardEvent, trueFilter } from "diagnostic-channel";

import { winston } from "diagnostic-channel-publishers";

let handlers: LogHandler[] = [];

const winstonToAILevelMap: { [key: string]: (og: string) => string } = {
  syslog(og: string) {
    const map: { [key: string]: string } = {
      emerg: KnownSeverityLevel.Critical,
      alert: KnownSeverityLevel.Critical,
      crit: KnownSeverityLevel.Critical,
      error: KnownSeverityLevel.Error,
      warning: KnownSeverityLevel.Warning,
      notice: KnownSeverityLevel.Information,
      info: KnownSeverityLevel.Information,
      debug: KnownSeverityLevel.Verbose,
    };

    return map[og] === undefined ? KnownSeverityLevel.Information : map[og];
  },
  npm(og: string) {
    const map: { [key: string]: string } = {
      error: KnownSeverityLevel.Error,
      warn: KnownSeverityLevel.Warning,
      info: KnownSeverityLevel.Information,
      verbose: KnownSeverityLevel.Verbose,
      debug: KnownSeverityLevel.Verbose,
      silly: KnownSeverityLevel.Verbose,
    };

    return map[og] === undefined ? KnownSeverityLevel.Information : map[og];
  },
  unknown(og: string) {
    return KnownSeverityLevel.Information;
  },
};

const subscriber = (event: IStandardEvent<winston.IWinstonData>) => {
  const message = event.data.message as Error | string;
  handlers.forEach((handler) => {
    if (message instanceof Error) {
      handler.trackException({
        exception: message,
        properties: event.data.meta,
      });
    } else {
      const AIlevel = winstonToAILevelMap[event.data.levelKind](event.data.level);
      handler.trackTrace({
        message: message,
        severity: AIlevel,
        properties: event.data.meta,
      });
    }
  });
};

export function enable(enabled: boolean, handler: LogHandler) {
  if (enabled) {
    let handlerFound = handlers.find((c) => c == handler);
    if (handlerFound) {
      return;
    }
    if (handlers.length === 0) {
      channel.subscribe<winston.IWinstonData>(
        "winston",
        subscriber,
        trueFilter,
        (module: string, version: string) => {
          if (handler.statsbeat) {
            handler.statsbeat.addInstrumentation(StatsbeatInstrumentation.WINSTON);
          }
        }
      );
    }
    handlers.push(handler);
  } else {
    handlers = handlers.filter((c) => c != handler);
    if (handlers.length === 0) {
      channel.unsubscribe("winston", subscriber);
    }
  }
}

export function dispose() {
  channel.unsubscribe("winston", subscriber);
  handlers = [];
}
