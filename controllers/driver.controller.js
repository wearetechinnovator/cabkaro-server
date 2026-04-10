const driverModel = require("../models/driver.model.js");
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



class Driver {
    static register = async (req, res) => {
        const {
            name, email, phone, password, gender, driving_license_number, adhar_number,
            profile_img, vehicle_number, service_radius_km
        } = req.body;

        if ([
            name, email, phone, password, gender, driving_license_number, adhar_number,
            vehicle_number, service_radius_km
        ].some(field => !field)) {
            throw new ApiError(400, "All fields are required");
        }

        const isExists = await driverModel.findOne({ phone });
        if (isExists) {
            throw new ApiError(409, "Driver already exists");
        }

        let uploadedFiles = [];
        let profilePic;

        try {
            if (profile_img) {
                profilePic = await uploadImage(req.body.profile_img);
                if (!profilePic.success) throw new Error("Profile pic upload failed");
                uploadedFiles.push(profilePic.fileName);
            }

            // Hash password
            const hashedPassword = await bcryptJs.hash(password, 12);

            // Insert into DB
            const newDriver = await driverModel.create({
                name,
                email,
                phone,
                password: hashedPassword,
                gender,
                adhar_number,
                driving_license_number,
                profile_img: profilePic?.fileName || null,
                vehicle_number,
                service_radius_km
            });

            return res.status(201).json({ data: newDriver });

        } catch (err) {
            // Rollback uploaded files safely
            await Promise.all(
                uploadedFiles.map(file =>
                    fs.promises.unlink(
                        path.join(__dirname, "..", "uploads", file)
                    ).catch(() => { }) // ignore errors
                )
            );

            throw new ApiError(500, err.message || "Something went wrong");
        }
    }


    static uploadDocuments = async (req, res) => {
        const { adhar_img, driving_license_img, vehicle_proof, vehicle_img } = req.body;
        const driverData = req.user; // from auth middleware

        if ([adhar_img, driving_license_img, vehicle_proof, vehicle_img].some(field => !field)) {
            throw new ApiError(400, "All document images are required");
        }

        let uploadedFiles = [];

        try {
            // Upload all documents in parallel
            const uploadResults = await Promise.all([
                uploadImage(adhar_img),
                uploadImage(driving_license_img),
                uploadImage(vehicle_proof),
                uploadImage(vehicle_img)
            ]);
            uploadResults.forEach((result, index) => {
                if (!result.success) throw new Error(`Document ${index + 1} upload failed`);
                uploadedFiles.push(result.fileName);
            });

            // Update driver document fields in DB
            const update = await driverModel.updateOne({ _id: driverData.id }, {
                $set: {
                    adhar_img: uploadResults[0].fileName,
                    driving_license_img: uploadResults[1].fileName,
                    vehicle_proof: uploadResults[2].fileName,
                    vehicle_img: uploadResults[3].fileName
                }
            })

            if (update.modifiedCount === 0) {
                throw new Error("Failed to upload documents");
            }

            return res.status(200).json({ msg: "Documents uploaded successfully" });

        } catch (err) {
            await Promise.all(
                uploadedFiles.map(file =>
                    fs.promises.unlink(
                        path.join(__dirname, "..", "uploads", file)
                    ).catch(() => { }) // ignore errors
                )
            );
            throw new ApiError(500, err.message || "Something went wrong");
        }

    }


    static update = async (req, res) => {
        const {
            name, email, phone, gender, driving_license_number, adhar_number,
            vehicle_number, service_radius_km
        } = req.body;
        const driverData = req.user; // from auth middleware

        if ([
            name, email, phone, gender, driving_license_number, adhar_number,
            vehicle_number, service_radius_km
        ].some(field => !field)) {
            throw new ApiError(400, "All fields are required");
        }


        const updateDriver = await driverModel.updateOne({ _id: driverData.id }, {
            $set: {
                name, email, phone, gender, driving_license_number, adhar_number,
                vehicle_number, service_radius_km
            }
        })

        if (updateDriver.modifiedCount === 0) {
            throw new ApiError(500, "Failed to update driver");
        }

        res.status(200).json({ msg: "Driver updated successfully" });

    }


    static changePassword = async (req, res) => {
        const { currentPass, newPass } = req.body;
        const driverData = req.user;

        if (!currentPass || !newPass) {
            throw new ApiError(400, "Current and New Password is required.");
        }


        // Check validation
        if (newPass.length < 8) {
            throw new ApiError(500, "Please enter minimum 8 char password");
        }

        // Check Current password is correct or not
        const data = await driverModel.findOne({ _id: driverData.id });
        const checkPass = bcryptJs.compareSync(currentPass, data.password);

        if (!checkPass) {
            throw new ApiError(500, "Invalid current Password");
        }

        // Hash new password
        const hash = await bcryptJs.hash(newPass, 10)

        // update Password
        const update = await driverModel.updateOne({ _id: driverData.id }, {
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
        const driverData = req.user;

        if (!profile_pic) {
            throw new ApiError(500, "Upload your profile picture")
        }

        // Get Previouse filename
        const driver = await driverModel.findOne({ _id: driverData.id });

        // Delete previous file
        try {
            const FILE = path.join(this.UPLOAD_DIR, driver.profile_img);
            await fs.unlink(FILE);
        } catch (error) {
            throw new ApiError(500, "File upload fail");
        }

        // Upload and save filename
        const upload = await uploadImage(profile_pic);
        if (!upload.success) {
            throw new ApiError(500, "Failed to upload profile picture");
        }

        const update = await driverModel.updateOne({ _id: driverData.id }, {
            profile_img: upload ? upload.fileName : undefined
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
        const isExists = await driverModel.findOne({ phone });
        if (!isExists) {
            throw new ApiError(404, "Incorrect phone number or password");
        }

        // Check password;
        const isPasswordCorrect = await bcryptJs.compare(password, isExists.password);
        if (!isPasswordCorrect) {
            throw new ApiError(404, "Incorrect phone number or password");
        }

        //Send OTP;
        const otp = await sendOtp({ phone });
        console.log("Driver [OTP]:", otp);

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
        const driver = await driverModel.findOne({ phone });
        if (!driver) {
            throw new ApiError(404, "Driver not found");
        }

        //  Delete OTP after success
        await otpModel.deleteMany({ phone });

        //  Generate token
        const token = jwt.sign({ id: driver._id, name: driver.name }, process.env.TOKEN_HASH);

        const data = {
            _id: driver._id,
            name: driver.name,
            phone: driver.phone,
            gender: driver.gender,
            profile_img: driver.profile_img
        };

        return res.status(200).json({ token, data });

    };


    static getDriver = async (req, res) => {
        const driverId = req.params.id;

        if (!driverId) {
            throw new ApiError(400, "Driver ID is missing");
        }

        // Password ke exclude kore data return korbe
        const data = await driverModel.findOne({ _id: driverId }).select("-password");
        if (!data) {
            throw new ApiError(404, "Driver not found");
        }

        return res.status(200).json(data);

    }


    static updateLocatoin = async (req, res) => {
        const { lng, lat } = req.body;
        const driverData = req.user;

        if (!lng || !lat) {
            throw new ApiError(400, "Please provide longitude and latitude")
        }

        await redis.set(
            `driver:${driverData.id}:location`,
            JSON.stringify({ lng, lat })
        );


        // Push to queue; `job-name, data, options`
        locationQueue.add(
            "driver-location",
            {
                id: driverData.id
            },
            {
                jobId: `location-${driverData.id}`,
                delay: 10000,
                removeOnComplete: true,
                removeOnFail: true
            }
        )


        return res.status(200).json({ msg: "Location update success" })
    }


    static toggleAvailability = async (req, res) => {
        const { is_available } = req.body;
        const driverData = req.user;

        if (is_available === null || is_available === undefined || typeof is_available !== "boolean") {
            throw new ApiError(400, "is_available field must be boolean");
        }

        const update = await driverModel.updateOne({ _id: driverData.id }, {
            $set: {
                is_available
            }
        })

        if (update.modifiedCount === 0) {
            throw new ApiError(500, "Failed to update availability");
        }

        return res.status(200).json({ msg: `You are now ${is_available ? "available" : "unavailable"}` });
    }

}


module.exports = Driver;