const driverModel = require("../models/driver.model.js");


const nearRideHandler = (socket, io) => {
    socket.on("near-ride-request", async (data) => {
        const { lat, lng } = data;

        if (lat === null || lng === null) {
            socket.emit("near-ride-response", { err: "Latitude and longitude are required" });
            return;
        }

        // First get driver service radius
        const driver = await driverModel.findById(driverData._id);
        if (!driver) {
            socket.emit("near-ride-response", { err: "Driver not found" });
            return;
        }
        const serviceRadius = driver.service_radius_km;



    })
}

module.exports = nearRideHandler;