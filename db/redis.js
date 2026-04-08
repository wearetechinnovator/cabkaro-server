const IoRedis = require('ioredis');

const HOST = process.env.REDIS_URL;
const PORT = process.env.REDIS_PORT;

const redis = new IoRedis({
  host: HOST,
  port: PORT,
  maxRetriesPerRequest: null, 
});

module.exports = redis;