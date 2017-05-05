// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import ApplicationInsights = require("../../applicationinsights");
import {SeverityLevel} from "../../Declarations/Contracts";

import {channel, IStandardEvent} from "diagnostic-channel";

import {console as consolePub} from "diagnostic-channel-publishers";

const subscriber = (event: IStandardEvent<consolePub.IConsoleData>) => {
    if (ApplicationInsights.client) {
        ApplicationInsights.client.trackTrace(event.data.message, event.data.stderr ? SeverityLevel.Warning : SeverityLevel.Information);
    }
};

export function enable(enabled: boolean) {
    if (enabled) {
        channel.subscribe<consolePub.IConsoleData>("console", subscriber);
    } else {
        channel.unsubscribe("console", subscriber);
    }
}