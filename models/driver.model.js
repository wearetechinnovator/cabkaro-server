const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: Number,
    password: String,
    gender: String,
    driving_license: String,
    adhar_number: Number,
    profile_pic: String,
    vehicle_number: String,
    vehicle_img: String,
    is_available: Boolean,
    vehicle_proof: String,
    current_location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point"
        },
        coordinates: {
            type: [Number], // [long, lat]
            required: true
        }
    },
    service_radius_km: Number,
}, { timestamps: true })

driverSchema.index({current_location: '2dsphere'})
const driverModel = mongoose.model('driver', driverSchema);

module.exports = driverModel;