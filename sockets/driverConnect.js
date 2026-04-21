const driverModel = require("../models/vendor.model.js");
const SockKeys = require("../constants/socket.js");


const driverConnect = (socket, io) => {
    socket.on(SockKeys.DRIVER_CONNECT, async (data) => {
        const driverId = socket.user?.id;

        try {
            await driverModel.findByIdAndUpdate(driverId, {
                socket_id: socket.id,
            })
        } catch (err) {
            console.error("Error storing socket ID:", err);
        }
    });


    // Remove socket ID when driver disconnects
    socket.on("disconnect", async () => {
        try {
            await driverModel.findOneAndUpdate(
                { socket_id: socket.id },
                { socket_id: null }
            );
        } catch (err) {
            console.error("Error removing socket ID:", err);
        }
    });
};

module.exports = driverConnect;