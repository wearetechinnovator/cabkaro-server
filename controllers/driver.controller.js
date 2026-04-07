const driverModel = require("../models/driver.model.js");
const ApiError = require("../utils/ApiError.js");
const bcryptJs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const uploadImage = require("../utils/upload");
const sendOtp = require("../services/sendOtp.service.js");
const otpModel = require("../models/otp.model.js");


class Driver {

    static register = async (req, res) => {
        const { name, phone, password, gender, profile_pic } = req.body;

        if ([name, phone, password, gender].some(field => !field)) {
            throw new ApiError(400, "All fields are required");
        }

        const userExists = await userModel.findOne({ phone });
        if (userExists) {
            throw new ApiError(409, "User with this phone number already exists");
        }

        // Hash password
        const hashedPassword = await bcryptJs.hash(password, 10);

        // Upload profile picture
        let upload;
        if (profile_pic) {
            upload = await uploadImage(profile_pic);
            if (!upload.success) {
                throw new ApiError(500, "Failed to upload profile picture");
            }
        }

        const newUser = await userModel.create({
            name, phone, password: hashedPassword, gender,
            profile_pic: upload ? upload.fileName : undefined
        });

        if (!newUser) {
            throw new ApiError(500, "Failed to create user");
        }

        res.status(201).json({ data: newUser });

    }

}


module.exports = Driver;