const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
    phone: String,
    otp: String,
    expiresAt: {
        type: Date,
        required: true
    }
}, {timestamps: true});

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("otp", otpSchema);