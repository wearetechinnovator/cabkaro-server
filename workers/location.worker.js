const redis = require("../db/redis");
const { Worker } = require("bullmq");
const userModel = require('../models/user.model');
const driverModel = require("../models/driver.model");


new Worker("locationQueue", async (job) => {
    if (job.name === "user-location") {
        const { id } = job.data;
        const raw = await redis.get(`user:${id}:location`);
        const data = JSON.parse(raw);

        await userModel.updateOne({ _id: id }, {
            $set: {
                current_location: {
                    type: "Point",
                    coordinates: [data.lng, data.lat]
                }
            }
        })
    }

    else if (job.name === "driver-location") {
        const { id } = job.data;
        const raw = await redis.get(`driver:${id}:location`);
        const data = JSON.parse(raw);

        await driverModel.updateOne({ _id: id }, {
            $set: {
                current_location: {
                    type: "Point",
                    coordinates: [data.lng, data.lat]
                }
            }
        })
    }
}, { connection: redis });
