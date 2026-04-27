const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    vendor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'vendor',
        required: true,
        index: true
    },
    vehicle_number: {
        type: String,
        required: [true, "Enter vehicle number"],
        unique: true

    },
    vechicle_img: String,
    is_ac: {
        type: String,
        enum: ['Yes', 'No'],
        required: true
    },
    is_sos: {
        type: String,
        enum: ['Yes', 'No'],
        required: true
    },
    is_first_aid_kid: {
        type: String,
        enum: ['Yes', 'No'],
        required: true
    },
    facilities: String,
    number_of_seats: Number,
    is_available: {
        type: Boolean,
        default: true
    },
    service_location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point"
        },
        coordinates: {
            type: [Number], // [long, lat]
            default: [0, 0]
        }
    },
    service_radius_km: Number,
}, { timestamps: true })

vehicleSchema.index({ service_location: '2dsphere' })

const vehicleModel = mongoose.model('car', vehicleSchema);
module.exports = vehicleModel;