const driverModel = require("../models/driver.model.js");
const ApiError = require("../utils/ApiError.js");
const redis = require("../db/redis.js");
const rideModel = require("../models/ride.model.js");
const {socketIO} = require("../sockets/index.js");



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
            user: userData._id,
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
        await redis.geoAdd("rides", {
            longitude: pickup_location.lng,
            latitude: pickup_location.lat,
            member: newRide._id.toString(),
        });

        // Send real-time update to drivers about new ride;
        // socketIO.emit("new-ride", newRide);


        return res.status(201).json({ data: newRide });
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

    }


}


module.exports = RideController;