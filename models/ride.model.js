const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "driver",
        default: null
    },
    pickup_city: String,
    drop_city: String,
    pickup_location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point"
        },
        coordinates: [Number], // [long, lat]
    },
    drop_location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point"
        },
        coordinates: [Number], // [long, lat]
    },
    pickup_date: Date,
    pickup_time: String,
    pickup_address: String,
    drop_address: String,
    distance_km: Number,
    price: Number,
    status: {
        type: String,
        enum: [
            'accepted',
            'completed',
            'cancelled',
            'searching'
        ],
        default: 'searching'
    },
}, { timestamps: true });


rideSchema.index({pickup_location: '2dsphere', drop_location: '2dsphere'});
const rideModel = mongoose.model('ride', rideSchema);

module.exports = rideModel;