const driverModel = require("../models/driver.model.js");
const ApiError = require("../utils/ApiError.js");
const redis = require("../db/redis.js");


class CabController {
    static getNearbyCabs = async (req, res) => {
        const { lat, lng } = req.query;
        const nearestKm = 5;

        if (!lat || !lng) {
            throw new ApiError(400, "Latitude and Longitude are required");
        }

        const drivers = await driverModel.find({
            is_available: true,
            current_location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: nearestKm * 1000
                }
            }
        });

        return res.status(200).json({
            msg: drivers.length ? "Drivers found" : "No drivers nearby",
            data: drivers
        });
    }

}

module.exports = CabController;
