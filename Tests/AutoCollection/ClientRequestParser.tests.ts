import http = require("http");
import assert = require("assert");
import sinon = require("sinon");

import ClientRequestParser = require("../../AutoCollection/ClientRequestParser");
import Contracts = require("../../Declarations/Contracts");

describe("AutoCollection/ClientRequestParser", () => {

    describe("#getDependencyData()", () => {
        let request: http.ClientRequest = <any>{
            agent: { protocol: "http" },
        };
        let response: http.ClientResponse = <any>{
        };

        it("should return correct data for a URL string", () => {
            (<any>request)["method"] = "GET";
            let parser = new ClientRequestParser("http://bing.com/search", request);

            response.statusCode = 200;
            parser.onResponse(response);

            let dependencyTelemetry = parser.getDependencyTelemetry();
            assert.equal(dependencyTelemetry.dependencyTypeName, Contracts.RemoteDependencyDataConstants.TYPE_HTTP);
            assert.equal(dependencyTelemetry.success, true);
            assert.equal(dependencyTelemetry.name, "GET /search");
            assert.equal(dependencyTelemetry.data, "http://bing.com/search");
            assert.equal(dependencyTelemetry.target, "bing.com");
        });

        it("should return correct data for a posted URL with query string", () => {
            (<any>request)["method"] = "POST";
            let parser = new ClientRequestParser("http://bing.com/search?q=test", request);

            response.statusCode = 200;
            parser.onResponse(response);

            let dependencyTelemetry = parser.getDependencyTelemetry();
            assert.equal(dependencyTelemetry.dependencyTypeName, Contracts.RemoteDependencyDataConstants.TYPE_HTTP);
            assert.equal(dependencyTelemetry.success, true);
            assert.equal(dependencyTelemetry.name, "POST /search");
            assert.equal(dependencyTelemetry.data, "http://bing.com/search?q=test");
            assert.equal(dependencyTelemetry.target, "bing.com");
        });

        it("should return correct data for a request options object", () => {
            let requestOptions = {
                host: "bing.com",
                port: 8000,
                path: "/search?q=test",
            };
            (<any>request)["method"] = "POST";
            let parser = new ClientRequestParser(requestOptions, request);

            response.statusCode = 200;
            parser.onResponse(response);

            let dependencyTelemetry = parser.getDependencyTelemetry();
            assert.equal(dependencyTelemetry.dependencyTypeName, Contracts.RemoteDependencyDataConstants.TYPE_HTTP);
            assert.equal(dependencyTelemetry.success, true);
            assert.equal(dependencyTelemetry.name, "POST /search");
            assert.equal(dependencyTelemetry.data, "http://bing.com:8000/search?q=test");
            assert.equal(dependencyTelemetry.target, "bing.com");
        });

        it("should return correct data for a request options object", () => {
            var path = "/finance/info?client=ig&q=";

            let requestOptions = {
                host: "finance.google.com",
                path: path + "msft"
            };
            (<any>request)["method"] = "GET";
            let parser = new ClientRequestParser(requestOptions, request);

            response.statusCode = 200;
            parser.onResponse(response);

            let dependencyTelemetry = parser.getDependencyTelemetry();
            assert.equal(dependencyTelemetry.dependencyTypeName, Contracts.RemoteDependencyDataConstants.TYPE_HTTP);
            assert.equal(dependencyTelemetry.success, true);
            assert.equal(dependencyTelemetry.name, "GET /finance/info");
            assert.equal(dependencyTelemetry.data, "http://finance.google.com/finance/info?client=ig&q=msft");
            assert.equal(dependencyTelemetry.target, "finance.google.com");
        });

        it("should return non-success for a request error", () => {
            (<any>request)["method"] = "GET";
            let parser = new ClientRequestParser("http://bing.com/search", request);
            parser.onError(new Error("test error message"));

            let dependencyTelemetry = parser.getDependencyTelemetry();
            assert.equal(dependencyTelemetry.dependencyTypeName, Contracts.RemoteDependencyDataConstants.TYPE_HTTP);
            assert.equal(dependencyTelemetry.success, false);
            assert.ok(dependencyTelemetry.properties);
            assert.equal(dependencyTelemetry.properties.error, "test error message");
        });

        it("should return non-success for a response error status", () => {
            (<any>request)["method"] = "GET";
            let parser = new ClientRequestParser("http://bing.com/search", request);

            response.statusCode = 400;
            parser.onResponse(response);

            let dependencyTelemetry = parser.getDependencyTelemetry();
            assert.equal(dependencyTelemetry.dependencyTypeName, Contracts.RemoteDependencyDataConstants.TYPE_HTTP);
            assert.equal(dependencyTelemetry.success, false);
        });
    });
});
