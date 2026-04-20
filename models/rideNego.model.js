const mongoose = require("mongoose");


const rideNegotiationSchema = new mongoose.Schema({
    ride: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ride",
        required: true,
        index: true
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "driver",
        required: true,
        index: true
    },

    // Driver's offer
    proposed_price: Number,
    proposed_pickup_time: String,

    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'expired'],
        default: 'pending'
    },

    expires_at: Date
}, { timestamps: true });

const rideNegotiationModel = mongoose.model("ride_negotiation", rideNegotiationSchema);
module.exports = rideNegotiationModel;