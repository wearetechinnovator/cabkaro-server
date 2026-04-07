const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "driver"
    },
    pickup_location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point"
        },
        coordinates: [Number], // [long, lat]
        index: '2dsphere'
    },
    drop_location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point"
        },
        coordinates: [Number], // [long, lat]
        index: '2dsphere'
    },
    pickup_address: String,
    drop_address: String,
    distance_km: Number,
    price: Number,
    status: {
        type: String,
        enum: [
            'accepted',
            'completed',
            'cancelled'
        ],
        default: 'searching'
    },
}, { timestamps: true });

const rideModel = mongoose.model('ride', rideSchema);

module.exports = rideModel;