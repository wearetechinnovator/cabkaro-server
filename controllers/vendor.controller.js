const vendorModel = require("../models/vendor.model.js");
const vehicleModel = require("../models/vehicle.model.js");
const driverModel = require("../models/driver.model.js");
const ApiError = require("../utils/ApiError.js");
const sendOtp = require("../services/sendOtp.service.js");
const otpModel = require("../models/otp.model.js");



class VendorController {
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
        const vendor = await vendorModel.findOne({ vendor_phone: phone });
        if (!vendor) {
            throw new ApiError(404, "Vendor not found");
        }

        //  Delete OTP after success
        await otpModel.deleteMany({ phone });

        //  Generate token
        const token = jwt.sign({ id: vendor._id, name: vendor.name }, process.env.TOKEN_HASH);

        return res.status(200).json({ token, data: vendor });

    }


    static updateProfile = async (req, res) => {
        const {
            vendor_name, vendor_phone, vendor_img, vendor_type,
            current_location, service_radius_km
        } = req.body;
        const userData = req.user; // from auth middleware

        if ([vendor_name, vendor_phone, vendor_type, current_location, service_radius_km].some(field => !field)) {
            throw new ApiError(400, "All fields are required");
        }

        const updateVendor = await vendorModel.updateOne({ _id: userData.id }, {
            $set: {
                vendor_name, vendor_phone, vendor_img, vendor_type,
                current_location, service_radius_km
            }
        })

        if (updateVendor.modifiedCount === 0) {
            throw new ApiError(500, "Failed to update vendor");
        }

        return res.status(200).json({ msg: "Profile updated successfully" });

    }


}

module.exports = VendorController;