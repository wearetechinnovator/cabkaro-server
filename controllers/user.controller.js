const userModel = require("../models/user.model");
const ApiError = require("../utils/ApiError.js");
const fs = require('fs/promises');
const path = require("path");
const bcryptJs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const uploadImage = require("../utils/upload");
const sendOtp = require("../services/sendOtp.service.js");
const otpModel = require("../models/otp.model.js");
const redis = require("../db/redis.js");
const locationQueue = require("../queues/location.queue.js");



class UserController {
    static UPLOAD_DIR = path.join(__dirname, "..", "uploads");


    static register = async (req, res) => {
        const { name, phone, password, gender, profile_pic } = req.body;

        if ([name, phone, password].some(field => !field)) {
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


    static update = async (req, res) => {
        const { name, gender, profile_pic } = req.body;
        const userData = req.user;

        if ([name, gender].some(field => !field)) {
            throw new ApiError(400, "All fields are required");
        }

        // update
        const update = await userModel.updateOne({ _id: userData.id }, {
            $set: {
                name, gender,
            }
        })

        if (update.modifiedCount === 0) {
            throw new ApiError(500, "Profile not update");
        }

        return res.status(200).json({ msg: "Profile update successfully" });

    }


    static changePassword = async (req, res) => {
        const { currentPass, newPass } = req.body;
        const userData = req.user;

        if (!currentPass || !newPass) {
            throw new ApiError(400, "Current and New Password is required.");
        }


        // Check validation
        if (newPass.length < 8) {
            throw new ApiError(500, "Please enter minimum 8 char password");
        }

        // Check Current password is correct or not
        const data = await userModel.findOne({ _id: userData.id });
        const checkPass = bcryptJs.compareSync(currentPass, data.password);

        if (!checkPass) {
            throw new ApiError(500, "Invalid current Password");
        }

        // Hash new password
        const hash = await bcryptJs.hash(newPass, 10)
        // update Password
        const update = await userModel.updateOne({ _id: userData.id }, {
            $set: {
                password: hash
            }
        })

        if (update.modifiedCount === 0)
            throw new ApiError(500, "Password not change");

        return res.status(200).json({ msg: "Password change successfully" });
    }


    static updateProfileImg = async (req, res) => {
        const { profile_pic } = req.body;
        const userData = req.user;

        if (!profile_pic) {
            throw new ApiError(500, "Upload your profile picture")
        }

        // Get Previouse filename
        const user = await userModel.findOne({ _id: userData.id });

        // Delete previous file
        try {
            const FILE = path.join(this.UPLOAD_DIR, user.profile_pic);
            await fs.unlink(FILE);
        } catch (error) {
            throw new ApiError(500, "File upload fail");
        }

        // Upload and save filename
        const upload = await uploadImage(profile_pic);
        if (!upload.success) {
            throw new ApiError(500, "Failed to upload profile picture");
        }

        const update = await userModel.updateOne({ _id: userData.id }, {
            profile_pic: upload ? upload.fileName : undefined
        })

        if (update.modifiedCount === 0) {
            throw new ApiError(500, "Failed to upload profile picture");
        }


        return res.status(200).json({ msg: "Profile picture upload successfully" });

    }


    static login = async (req, res) => {
        const { phone, password } = req.body;

        if (!phone || !password) {
            throw new ApiError(400, "require the blanks");
        }

        // check phone number exists
        const userExist = await userModel.findOne({ phone });
        if (!userExist) {
            throw new ApiError(404, "Incorrect phone number or password");
        }

        // check password;
        const isPasswordCorrect = await bcryptJs.compare(password, userExist.password);
        if (!isPasswordCorrect) {
            throw new ApiError(404, "Incorrect phone number or password");
        }

        //Send OTP;
        const otp = await sendOtp({ phone });
        console.log("User [OTP]:", otp);

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
        const user = await userModel.findOne({ phone });
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        //  Delete OTP after success
        await otpModel.deleteMany({ phone });

        //  Generate token
        const token = jwt.sign({ id: user._id, name: user.name }, process.env.TOKEN_HASH);

        const data = {
            _id: user._id,
            name: user.name,
            phone: user.phone,
            gender: user.gender,
            profile_pic: user.profile_pic
        };

        return res.status(200).json({ token, data });

    };


    static getUser = async (req, res) => {
        const userId = req.params.id;

        if (!userId) {
            throw new ApiError(400, "User ID is missing in token");
        }

        // password ke exclude kore data return korbe
        const data = await userModel.findOne({ _id: userId }).select("-password");
        if (!data) {
            throw new ApiError(404, "User not found");
        }

        return res.status(200).json(data);

    }


    static updateLocatoin = async (req, res) => {
        const { lng, lat } = req.body;
        const userData = req.user;

        if (!lng || !lat) {
            throw new ApiError(400, "Please provide longitude and latitude")
        }

        await redis.set(
            `user:${userData.id}:location`,
            JSON.stringify({ lng, lat })
        );


        // Push to queue; `job-name, data, options`
        locationQueue.add(
            "user-location",
            {
                id: userData.id
            },
            {
                jobId: `location-${userData.id}`,
                delay: 10000,
                removeOnComplete: true,
                removeOnFail: true
            }
        )


        return res.status(200).json({ msg: "Location update success" })
    }

}

module.exports = UserController;