///<reference path="..\Declarations\node\node.d.ts" />
///<reference path="..\Declarations\mocha\mocha.d.ts" />
///<reference path="..\Declarations\sinon\sinon.d.ts" />

import http = require("http");
import assert = require("assert");
import fs = require('fs'); 
import sinon = require("sinon");
import AppInsights = require("../applicationinsights");
import Sender = require("../Library/Sender");

/**
 * A fake response class that passes by default
 */
class fakeResponse {
    private callbacks: {[event:string]: ()=>void} = Object.create(null);
    public setEncoding(): void {}; 
    public statusCode: number; 
    
    constructor(private passImmediatly: boolean = true) {}
    
    public on(event: string, callback: ()=> void) {
        this.callbacks[event] = callback;
        if (event == "end" && this.passImmediatly) {
            this.pass();
        }
    }
    
    public pass(): void {
        this.statusCode = 200; 
        this.callbacks["end"] ? this.callbacks["end"](): null; 
    }
} 

/**
 * A fake request class that fails by default 
 */
class fakeReuqest {
    private callbacks: {[event:string]: ()=>void} = Object.create(null);
    public write(): void {}
    public end(): void {}

    constructor(private failImmediatly: boolean = true) {}
    
    public on(event: string, callback) {
        this.callbacks[event] = callback;
        if (event === "error" && this.failImmediatly) {
            setImmediate(() => this.fail()); 
        }
    }
    
    public fail(): void {
        this.callbacks["error"] ? this.callbacks["error"](): null; 
    }
}

describe("EndToEnd", () => {

    describe("Basic usage", function() {
        this.timeout(10000);

	before(() => {
            var originalHttpRequest = http.request;
            this.request = sinon.stub(http, "request", (options: any, callback: any) => {
                if(options.headers) {
                    options.headers["Connection"] = "close";
                } else {
                    options.headers = {
                        "Connection": "close"
                    }
                }
                console.log(JSON.stringify(options));
                return originalHttpRequest(options, callback);
            });
        });

        after(() => {
            this.request.restore();
        });

        it("should send telemetry", (done) => {
            var client =AppInsights.getClient();
            client.trackEvent("test event");
            client.trackException(new Error("test error"));
            client.trackMetric("test metric", 3);
            client.trackTrace("test trace");
            client.sendPendingData((response) => {
                assert.ok(response, "response should not be empty");
                done();
            });
        });

        it("should collect request telemetry", (done) => {
            AppInsights
                .setup()
                .start();

            var server = http.createServer((req: http.ServerRequest, res: http.ServerResponse) => {
                res.setHeader("Content-Type", "text/plain; charset=utf-8");
                res.end("server is up");
                setTimeout(() => {
                    AppInsights.client.sendPendingData((response) => {
                        assert.ok(response, "response should not be empty");
                        done();
                    });
                }, 10);
            });

            server.on("listening", () => {
                http.get("http://localhost:" + server.address().port +"/test", (response: http.ServerResponse) => {
                    response.on("end", () => {
                        server.close();
                    });
                });
            });
            server.listen(0, "::"); // "::" causes node to listen on both ipv4 and ipv6
        });
    });
     
    describe("Offline mode", () => {
        var AppInsights = require("../applicationinsights"); 
     
        
        beforeEach(() => {
            AppInsights.client = undefined;
            this.request = sinon.stub(http, 'request');
            this.writeFile = sinon.stub(fs, 'writeFile');
            this.writeFileSync = sinon.stub(fs, 'writeFileSync');
            this.exists = sinon.stub(fs, 'exists').yields(true);
            this.existsSync = sinon.stub(fs, 'existsSync').returns(true);
            this.readdir = sinon.stub(fs, 'readdir').yields(null, ['1.ai.json']);
            this.readFile = sinon.stub(fs, 'readFile').yields(null, '');
        });
        
        afterEach(()=> {
            this.request.restore();
            this.writeFile.restore();
            this.exists.restore();
            this.readdir.restore();
            this.readFile.restore();
            this.writeFileSync.restore();
            this.existsSync.restore();
    	});

        it("disabled by default", (done) => {
            var req = new fakeReuqest();

            var client = AppInsights.getClient("key"); 
            
            client.trackEvent("test event");
            
            this.request.returns(req); 
  
            client.sendPendingData((response) => {
                // yield for the caching behavior
                setImmediate(() => {
                    assert(this.writeFile.callCount === 0);
                    done();
                });
            });
        }); 
        
        it("stores data to disk when enabled", (done) => { 
            var req = new fakeReuqest();

            var client = AppInsights.getClient("key"); 
            client.channel.setOfflineMode(true);
            
            client.trackEvent("test event");
            
            this.request.returns(req); 
  
            client.sendPendingData((response) => {
                // yield for the caching behavior
                setImmediate(() => {
                    assert(this.writeFile.callCount === 1);
                    done();
                });
            });
        }); 
        
         it("checks for files when connection is back online", (done) => {
            var req = new fakeReuqest(false);
            var res = new fakeResponse();
            res.statusCode = 200; 
            Sender.WAIT_BETWEEN_RESEND =0; 

            var client = AppInsights.getClient("key"); 
            client.channel.setOfflineMode(true);
            
            client.trackEvent("test event");
            
            this.request.returns(req); 
            this.request.yields(res);
            
            client.sendPendingData((response) => {
                // wait until sdk looks for offline files
                setTimeout(() => {
                    assert(this.readdir.callCount === 1);
                    assert(this.readFile.callCount === 1);
                    done();
                }, 10);
            });
        }); 
        
        it("cache payload synchronously when process crashes", () => {
            var req = new fakeReuqest(true);

            var client = AppInsights.getClient("key"); 
            client.channel.setOfflineMode(true);
            
            client.trackEvent("test event");
            
            this.request.returns(req); 
            
            client.channel.triggerSend(true);
            
            assert(this.existsSync.callCount === 1);
            assert(this.writeFileSync.callCount === 1);
        }); 
        
            
        
     }); 
});
