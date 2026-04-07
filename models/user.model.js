const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    phone: {
        type: Number,
        index: true
    },
    password: String,
    gender: {
        type: String,
        enum: ["male", "female", "other"]
    },
    profile_pic: String,
    current_location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point"
        },
        coordinates: {
            type: [Number], // [lng, lat]
            required: true
        }
    },
}, { timestamps: true })

userSchema.index({ current_location: "2dsphere" });
const userModel = mongoose.model('user', userSchema);

module.exports = userModel;