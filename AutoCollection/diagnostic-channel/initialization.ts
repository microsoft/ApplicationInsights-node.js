// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

import {enable} from "diagnostic-channel-publishers";

if (!process.env["APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL"]) {
    enable();
}