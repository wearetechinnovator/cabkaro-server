const vendorModel = require("../models/vendor.model.js");
const vehicleModel = require("../models/vehicle.model.js");
const driverModel = require("../models/driver.model.js");
const ApiError = require("../utils/ApiError.js");
const sendOtp = require("../services/sendOtp.service.js");
const otpModel = require("../models/otp.model.js");
const jwt = require("jsonwebtoken");
const fs = require('fs/promises');
const path = require("path");
const uploadImage = require("../utils/upload.js");



class VendorController {
    static UPLOAD_DIR = path.join(__dirname, "..", "uploads");

    static login = async (req, res) => {
        const { vendor_phone } = req.body;

        if (!vendor_phone) {
            throw new ApiError(400, "Phone number is required");
        }

        //Send OTP;
        const otp = await sendOtp({ phone: vendor_phone });
        console.log("Vendor [OTP]:", otp);

        return res.status(200).json({ msg: "Login success" });

    }

    static verifyOTP = async (req, res) => {
        const { otp, phone } = req.body;

        if (!otp || !phone) {
            throw new ApiError(400, "Required fields are missing");
        }

        const record = await otpModel.findOne({ phone });
        if (!record) {
            throw new ApiError(400, "Invalid OTP");
        }

        //  Check expiry 
        if (record.expiresAt < new Date()) {
            throw new ApiError(400, "OTP expired");
        }

        //  Check OTP match
        if (record.otp !== otp) {
            throw new ApiError(400, "Invalid OTP");
        }

        // Get user
        let vendor = await vendorModel.findOne({ vendor_phone: phone });
        if (!vendor) {
            // Create new user if not exists
            vendor = new vendorModel({ vendor_phone: phone });
            await vendor.save();
        }

        //  Delete OTP after success
        await otpModel.deleteMany({ phone });

        //  Generate token
        const token = jwt.sign({ phone, id: vendor._id }, process.env.TOKEN_HASH);
        console.log(vendor);
        return res.status(200).json({ token, data: vendor });

    }

    static updateProfile = async (req, res) => {
        const { vendor_name, vendor_phone, vendor_img, vendor_type } = req.body;
        const userData = req.user; // from auth middleware

        if ([vendor_name, vendor_phone, vendor_type].some(field => !field)) {
            throw new ApiError(400, "All fields are required");
        }


        // Upload profile picture
        let upload;
        if (vendor_img) {
            upload = await uploadImage(vendor_img);
            if (!upload.success) {
                throw new ApiError(500, "Failed to upload profile picture");
            }
        }

        const updateVendor = await vendorModel.updateOne({ _id: userData.id }, {
            $set: {
                vendor_name, vendor_phone, vendor_img: upload ? upload.fileName : undefined,
                vendor_type, profile_step: "1"
            }
        })

        if (updateVendor.modifiedCount === 0) {
            throw new ApiError(500, "Failed to update vendor");
        }

        return res.status(200).json({ msg: "Profile updated successfully" });

    }

    static getProfile = async (req, res) => {
        const userData = req.user; // from auth middleware

        const vendor = await vendorModel.findById(userData.id)

        if (!vendor) {
            throw new ApiError(404, "Vendor not found");
        }

        return res.status(200).json({ data: vendor });
    };

}

module.exports = VendorController;