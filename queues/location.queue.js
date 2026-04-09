const { Queue } = require('bullmq');
const redis = require('../db/redis');

const locationQueue = new Queue("locationQueue", {
    connection: redis,
});

module.exports = locationQueue;
