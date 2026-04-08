const { Worker } = require("bullmq");
const userModel = require('../models/user.model');
const redis = require("../db/redis");


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

    }
}, { connection: redis });
