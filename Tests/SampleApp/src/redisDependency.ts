import redis = require('redis');
import express = require("express");
import http = require("http");

const REDIS_PORT = 6379;
const REDIS_HOST = "redis";
var redisClient: redis.RedisClient = null;


export function generateRedisDepdendency(req: express.Request, res: http.ServerResponse) {
    // TBD
    /*
    if (!redisClient) {
        redis.createClient(REDIS_PORT, REDIS_HOST);
        redisClient.on('connect', function () {
            appInsightsClient.trackEvent('RedisClientConnected');
        });
    }
    */
}