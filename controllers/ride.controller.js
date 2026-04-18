const driverModel = require("../models/driver.model.js");
const ApiError = require("../utils/ApiError.js");
const redis = require("../db/redis.js");
const rideModel = require("../models/ride.model.js");
const { socketIO } = require("../sockets/index.js");



class RideController {
    static createRide = async (req, res) => {
        const {
            pickup_location, drop_location, price, pickup_date, pickup_time
        } = req.body;
        const userData = req.user;

        if (!pickup_location || !drop_location || !price || !pickup_date || !pickup_time) {
            throw new ApiError(400, "All fields are required");
        }

        if (
            pickup_location.lat == null ||
            pickup_location.lng == null ||
            drop_location.lat == null ||
            drop_location.lng == null
        ) {
            throw new ApiError(400, "Invalid pickup or drop location");
        }


        // Insert into DB
        const newRide = await rideModel.create({
            user: userData.id,
            pickup_location: {
                type: "Point",
                coordinates: [pickup_location.lng, pickup_location.lat]
            },
            drop_location: {
                type: "Point",
                coordinates: [drop_location.lng, drop_location.lat]
            },
            price,
            pickup_date,
            pickup_time
        })

        if (!newRide) {
            throw new ApiError(500, "Failed to create ride");
        }

        // insert in Redis;
        await redis.geoadd(
            "rides",
            Number(pickup_location.lng),
            Number(pickup_location.lat),
            newRide._id.toString()
        );


        return res.status(201).json({ data: newRide });
    }


    static editRide = async (req, res) => {
        const {
            pickup_location, drop_location, price, pickup_date, pickup_time, 
            rideId
        } = req.body;
        const userData = req.user;

        if (!pickup_location || !drop_location || !price || !pickup_date || !pickup_time || !rideId) {
            throw new ApiError(400, "All fields are required");
        }

        if (
            pickup_location.lat == null ||
            pickup_location.lng == null ||
            drop_location.lat == null ||
            drop_location.lng == null
        ) {
            throw new ApiError(400, "Invalid pickup or drop location");
        }

        // Ride Exis or not;
        const ride = await rideModel.findOne({ _id: rideId, user: userData.id });
        if (!ride) {
            throw new ApiError(404, "Ride not found or unauthorized");
        }

        // Check Ride Edit or not
        const isRideEdit = await rideModel.findOne({ _id: rideId, status: "searching" });
        if (!isRideEdit) {
            throw new ApiError(404, "This ride can't edit now");
        }


        // Edit in DB
        const editR = await rideModel.updateOne({ _id: rideId }, {
            $set: {
                pickup_location: {
                    type: "Point",
                    coordinates: [pickup_location.lng, pickup_location.lat]
                },
                drop_location: {
                    type: "Point",
                    coordinates: [drop_location.lng, drop_location.lat]
                },
                price,
                pickup_date,
                pickup_time
            }
        })

        if (editR.modifiedCount === 0) {
            throw new ApiError(500, "Ride not update");
        }


        await redis.geoadd(
            "rides",
            Number(pickup_location.lng),
            Number(pickup_location.lat),
            rideId.toString()
        );

        return res.status(200).json({
            msg: "Ride updated successfully"
        });

    }


    static getNearestRide = async (req, res) => {
        const { lat, lng } = req.query;
        const driverData = req.user; //from auth middleware;

        if (!lat || !lng) {
            throw new ApiError(400, "Latitude and Longitude are required");
        }


        // First get driver service radius
        const driver = await driverModel.findById(driverData._id);
        if (!driver) {
            throw new ApiError(404, "Driver not found");
        }
        const serviceRadius = driver.service_radius_km;

        // Get Rides within that radius where status is searching;
        const rides = await redis.geoSearch(
            "rides",
            {
                longitude: parseFloat(lng),
                latitude: parseFloat(lat)
            },
            {
                radius: serviceRadius, // km
                unit: "km"
            },
            ["WITHDIST", "COUNT", 20]
        );

        console.log(rides);

    }


}


module.exports = RideController;