const IORedis = require('ioredis');

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
};

const redisConnection = new IORedis(redisConfig);

module.exports = {
  redisConnection,
  redisConfig,
};
