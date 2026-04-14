const otpModel = require("../models/otp.model");

const sendOtp = async ({ phone }) => {
    // Genarate OTP;
    let OTP = "";
    for (let i = 0; i < 5; i++) {
        OTP += Math.ceil(Math.random() * 9)
    }

    // Delete Previous OTPS;
    await otpModel.deleteMany({ phone });

    // Save in DB;
    await otpModel.create({
        phone: phone,
        otp: OTP,
        expiresAt: new Date(Date.now() + 2 * 60 * 1000)
    })

    // Send User
    return OTP;
}

module.exports = sendOtp;