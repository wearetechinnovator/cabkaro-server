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
const vendorModel = require("../models/vendor.model.js");



class Driver {
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


    static getDriverById = async (req, res) => {
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

    // Add and Update Driver;
    static addDriver = async (req, res) => {
        console.log("run...")
        const { driverDetails } = req.body;
        const userData = req.user; // from auth middleware

        if (driverDetails.length < 1) {
            throw new ApiError(400, "Vendor ID and at least one driver detail are required");
        }

        // Check if vendor exists
        const vendor = await vendorModel.findById(userData.id);
        if (!vendor) {
            throw new ApiError(404, "Vendor not found");
        }

        // Check all fields available in each driver detail
        for (let driver of driverDetails) {
            const { driver_name, driver_phone, driver_img } = driver;

            if ([driver_name, driver_phone, driver_img].some(field => !field || field === "")) {
                throw new ApiError(400, "All fields are required for each driver");
            }
        }

        // Add drivers to DB
        const driversToAdd = await Promise.all(
            driverDetails.map(async (driver) => {
                // Upload image if a new base64 image is provided
                let driverImgUrl = driver.driver_img;

                const isBase64 = typeof driver.driver_img === "string" &&
                    driver.driver_img.startsWith("data:");

                if (isBase64) {
                    const upload = await uploadImage(driver.driver_img);
                    if (!upload.success) {
                        throw new ApiError(500, `Failed to upload image for driver ${driver.driver_name}`);
                    }
                    driverImgUrl = upload.fileName;
                }

                if (driver._id) {
                    // Existing driver — update by _id
                    return {
                        updateOne: {
                            filter: { _id: driver._id, vendor_id: userData.id },
                            update: {
                                $set: {
                                    driver_name: driver.driver_name,
                                    driver_phone: driver.driver_phone,
                                    driver_img: driverImgUrl
                                }
                            }
                        }
                    };
                } else {
                    // New driver — insert it
                    return {
                        insertOne: {
                            document: {
                                vendor_id: userData.id,
                                driver_name: driver.driver_name,
                                driver_phone: driver.driver_phone,
                                driver_img: driverImgUrl
                            }
                        }
                    };
                }
            })
        );

        const result = await driverModel.bulkWrite(driversToAdd);
        if (!result || (result.insertedCount === 0 && result.modifiedCount === 0 && result.upsertedCount === 0)) {
            throw new ApiError(500, "Failed to process drivers");
        }

        // Update vendor profile
        await vendorModel.updateOne({ _id: userData.id }, { $set: { profile_step: "3",  profile_completed: true } })

        return res.status(200).json({ msg: "Drivers processed successfully" });


    }

    // Get all drivers of a vendor
    static getVendorDriver = async (req, res) => {
        const userData = req.user; // from auth middleware

        // Check if vendor exists
        const vendor = await vendorModel.findById(userData.id);
        if (!vendor) {
            throw new ApiError(404, "Vendor not found");
        }

        const drivers = await driverModel.find({ vendor_id: userData.id });
        console.log(drivers);
        return res.status(200).json({ data: drivers });

    }

    // Delete driver by ID
    static deleteDriverById = async (req, res) => {
        const { id } = req.params;
        if (!id) {
            throw new ApiError(400, "Driver ID is required");
        }

        const deletedDriver = await driverModel.findByIdAndDelete(id);
        if (!deletedDriver) {
            throw new ApiError(404, "Driver not found or already deleted");
        }

        return res.status(200).json({ msg: "Driver deleted successfully", data: deletedDriver });

    }


}


module.exports = Driver;