// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import { channel, IStandardEvent, trueFilter } from "diagnostic-channel";
import { bunyan } from "diagnostic-channel-publishers";

import { LogHandler } from "../../library/Handlers/LogHandler";
import { KnownSeverityLevel } from "../../declarations/generated";
import { StatsbeatInstrumentation } from "../../declarations/constants";

let handlers: LogHandler[] = [];

// Mapping from bunyan levels defined at https://github.com/trentm/node-bunyan/blob/master/lib/bunyan.js#L256
const bunyanToAILevelMap: { [key: number]: string } = {
  10: KnownSeverityLevel.Verbose,
  20: KnownSeverityLevel.Verbose,
  30: KnownSeverityLevel.Information,
  40: KnownSeverityLevel.Warning,
  50: KnownSeverityLevel.Error,
  60: KnownSeverityLevel.Critical,
};

const subscriber = (event: IStandardEvent<bunyan.IBunyanData>) => {
  let message = event.data.result as string;
  handlers.forEach((handler) => {
    try {
      // Try to parse message as Bunyan log is JSON
      let log: any = JSON.parse(message);
      if (log.err) {
        handler.trackException({ exception: log.err });
        return;
      }
    } catch (ex) {
      // Ignore error
    }
    const AIlevel = bunyanToAILevelMap[event.data.level];
    handler.trackTrace({ message: message, severity: AIlevel });
  });
};

export function enable(enabled: boolean, handler: LogHandler) {
  if (enabled) {
    let handlerFound = handlers.find((c) => c == handler);
    if (handlerFound) {
      return;
    }
    if (handlers.length === 0) {
      channel.subscribe<bunyan.IBunyanData>("bunyan", subscriber, trueFilter, (module, version) => {
        if (handler.statsbeat) {
          handler.statsbeat.addInstrumentation(StatsbeatInstrumentation.BUNYAN);
        }
      });
    }
    handlers.push(handler);
  } else {
    handlers = handlers.filter((c) => c != handler);
    if (handlers.length === 0) {
      channel.unsubscribe("bunyan", subscriber);
    }
  }
}

export function dispose() {
  channel.unsubscribe("bunyan", subscriber);
  handlers = [];
}
