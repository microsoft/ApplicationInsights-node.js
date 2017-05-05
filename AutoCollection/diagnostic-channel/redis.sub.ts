// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import ApplicationInsights = require("../../applicationinsights");
import {channel, IStandardEvent} from "diagnostic-channel";

import {redis} from "diagnostic-channel-publishers";

export const subscriber = (event: IStandardEvent<redis.IRedisData>) => {
    if (ApplicationInsights.client) {
        if (event.data.commandObj.command === "info") {
            // We don't want to report 'info', it's irrelevant
            return;
        }
        ApplicationInsights.client.trackDependency(
            event.data.address,
            event.data.commandObj.command,
            event.data.duration,
            !event.data.err,
            "redis"
        );
    }
};

export function enable(enabled: boolean) {
    if (enabled) {
        channel.subscribe<redis.IRedisData>("redis", subscriber);
    } else {
        channel.unsubscribe("redis", subscriber);
    }
}