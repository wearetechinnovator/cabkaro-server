const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: Number,
    password: String,
    gender: String,
    driving_license_number: String,
    vehicle_number: String,
    adhar_number: Number,
    profile_img: String,

    adhar_img: String,
    driving_license_img: String,
    vehicle_proof: String,
    vehicle_img: String,
    
    is_available: {
        type: Boolean,
        index: true
    },
    current_location: {
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

driverSchema.index({current_location: '2dsphere'})
const driverModel = mongoose.model('driver', driverSchema);

module.exports = driverModel;