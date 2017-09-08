import url = require('url');
import http = require('http');
import express = require('express');

var getFromFinanceServer = (symbol: string, onResponse: (responseData: string) => void) => {
    symbol = symbol.toLowerCase();
    var path = "/finance/info?client=ig&q=";
    http.get({ host: "finance.google.com", path: path + symbol }, function (response) {
        if (response.statusCode !== 200) {
            onResponse(null);
        }
        var stockData = "";
        response.on('data', function (d: string) {
            stockData += d;
        });
        response.on("end", function () {
            onResponse(stockData);
        });
        response.on("error", function () {
            onResponse(null);
        });
    });
}

export function generateHttpDependency(req: express.Request, res: http.ServerResponse) {
    var url_parts = url.parse(req.url, true);
    var query = url_parts.query;
    var stock = query["s"];
    var data = null;

    if (stock) {
        // Normalize stock symbol
        stock = stock.toLowerCase();
        // otherwise attempt to get the data from finance server
        getFromFinanceServer(stock, function (financeServerData) {
            // can the data be retrieved from finance server?
            if (financeServerData) {
                // write it to data
                data = financeServerData;
                res.end(data);
            }
        });
    } else {
        // stock cannot be retrieved, return 'Not found'
        res.statusCode = 400;
        res.end();
    }
}