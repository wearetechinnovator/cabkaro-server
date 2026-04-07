const mongoose = require('mongoose');


const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver"
    },
    title: String,
    message: String,
    type: {
        type: String,
        enum: [
            "ride_request",
            "ride_accepted",
            "driver_arrived",
            "ride_started",
            "ride_completed",
            "ride_cancelled",
        ]
    },
    ride: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ride"
    },
    is_read: {
        type: Boolean,
        default: false
    },
    fcm_token: String
}, { timestamps: true });

const notificationModel = mongoose.model('notification', notificationSchema);

module.exports = notificationModel;