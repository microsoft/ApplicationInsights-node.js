var http = require("http");
var url = require("url");

var appInsights = require("appInsights");

appInsights.filter("favicon");
start();
function start() {
    function onRequest(request, response) {
        var pathname = url.parse(request.url).pathname;
        var name = pathname.substring(1, pathname.length);

        response.writeHead(200, { "Content-Type": "text/plain" });
        response.write("Hello " + name + "!");
        response.end();
    }

    http.createServer(onRequest).listen(8888);
    console.log("Server has started.");
}
