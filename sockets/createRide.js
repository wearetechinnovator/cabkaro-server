const driverModel = require("../models/driver.model.js");
const SockKeys = require("../constants/socket.js");


const createRide = (socket, io) => {
    socket.on(SockKeys.RIDE_CRAETE_REQ, async (data) => {
        const { pickup_location, drop_location, price, pickup_date, pickup_time } = data;

        if (!pickup_location || !drop_location || !price || !pickup_date || !pickup_time) {
            return;
        }

        const pickupLat = pickup_location.lat;
        const pickupLng = pickup_location.lng;
        try {
            const relevantDrivers = await driverModel.aggregate([
                {
                    $geoNear: {
                        near: {
                            type: "Point",
                            coordinates: [pickupLng, pickupLat]
                        },
                        distanceField: "distance",  // distance in meters
                        spherical: true,
                        query: { is_available: true }
                    }
                },
                {
                    // Keep only drivers whose service radius covers the pickup point
                    $match: {
                        $expr: {
                            $lte: ["$distance", { $multiply: ["$service_radius_km", 1000] }]
                        }
                    }
                }
            ]);

            if (!relevantDrivers.length) {
                socket.emit(SockKeys.RIDE_CRAETE_RES, { msg: "No drivers available nearby" });
                return;
            }

            // Notify each relevant driver
            relevantDrivers.forEach(driver => {
                io.to(driver.socket_id).emit(SockKeys.NEAR_RIDE_REQ, {
                    pickup_location,
                    drop_location,
                    price,
                    pickup_date,
                    pickup_time,
                });
            });

        } catch (err) {
            console.error("Error finding drivers:", err);
            socket.emit(SockKeys.RIDE_CRAETE_RES, { msg: "Something went wrong" });
        }
    });
};

module.exports = createRide;