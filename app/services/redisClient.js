const Redis = require('ioredis');
const redis = new Redis({ host: 'redis', port: 6379 });
redis.on('connect', () => console.log('[REDIS] Connected'));
redis.on('error', (err) => console.error('[REDIS] Error:', err));
module.exports = redis;
