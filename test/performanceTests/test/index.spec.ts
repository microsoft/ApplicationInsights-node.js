// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { createPerfProgram } from "@azure-tools/test-perf";
import { TrackDependencyTest } from "./trackDependency.spec.js";
import { TrackTraceTest } from "./trackTrace.spec.js";
import https from "https";
import fs from "fs";

const json = JSON.parse(fs.readFileSync('package.json', 'utf8'));
let perfTestData: string = "";
const originalConsole = console.log;

console.log = function(message: string) {
    perfTestData += message;
};

const perfProgram = createPerfProgram(TrackDependencyTest, TrackTraceTest);
perfProgram.run().then(() => {
    console.log = originalConsole;
    const time = new Date().toISOString();
    const name = "SDKPerfTest";
    const iKey = process.env.GENEVA_IKEY;
    let sku = "";
    const ver = "4.0";
    const apiKey = process.env.API_KEY;
    const testName = "NodePerfTests";
    const unit = "ops/sec";
    const metric = "ops";
    const sdkVersion = json.dependencies['applicationinsights'].replace(/^\^/, '');
    let value = 0;
    
    if (perfTestData.includes("TrackDependencyTest")) {
        sku = "TrackDependencyTest";
    } else if (perfTestData.includes("TrackEventTest")) {
        sku = "TrackEventTest";
    }
    
    let regex = /(\d{1,3}(,\d{3})*) ops\/s/;
    const match = perfTestData.match(regex);
    console.log(`Match: ${match}`);
    console.log(`perfTestData: `, perfTestData);
    if (match) {
        // Remove commas from the result
        value = Number(match[1].replace(/,/g, ''));
        console.log(`Value: ${value}`);
        https.get(`https://browser.events.data.microsoft.com/OneCollector/1.0/t.js?qsp=true&name=%22${name}%22&time=%22${time}%22&ver=%22${ver}%22&iKey=%22${iKey}%22&apikey=${apiKey}&-testName=%22${testName}%22&-sku=%22${sku}%22&-version=%22${sdkVersion}%22&-unitOfMeasure=%22${unit}%22&-metric=%22${metric}%22&-value*6=${value}`, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(data);
            });
        }).on('error', (err) => {
            console.error(err);
        });
    } else {
        console.error("Error: Could not find a performance value to report.");
    }
});