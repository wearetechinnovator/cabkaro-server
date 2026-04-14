const driverModel = require("../models/driver.model.js");
const SockKeys = require("../constants/socket.js");



const nearRideHandler = (socket, io) => {
    socket.on(SockKeys.NEAR_RIDE_REQ, async (data) => {
        const {
            pickup_location, drop_location, price, pickup_date, pickup_time
        } = data;

        if (
            pickup_location.lat == null ||
            pickup_location.lng == null ||
            drop_location.lat == null ||
            drop_location.lng == null
        ) {
            socket.emit(SockKeys.NEAR_RIDE_RES, { err: "Latitude and longitude are required" });
            return;
        }

        // First get driver service radius
        const driver = await driverModel.findById(driverData._id);
        if (!driver) {
            socket.emit(SockKeys.NEAR_RIDE_RES, { err: "Driver not found" });
            return;
        }

        const serviceRadius = driver.service_radius_km;

    })
}

module.exports = nearRideHandler;