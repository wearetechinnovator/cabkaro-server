const userModel = require("../models/user.model");
const SockKeys = require("../constants/socket.js");


const userConnect = (socket, io) => {
    socket.on(SockKeys.USER_CONNECT, async (data) => {
        const userId = socket.user?.id;

        try {
            await userModel.findByIdAndUpdate(userId, {
                socket_id: socket.id,
            });

        } catch (err) {
            console.error("Error storing socket ID:", err);
        }
    });


    // Remove socket ID when driver disconnects
    socket.on("disconnect", async () => {
        try {
            await userModel.findOneAndUpdate(
                { socket_id: socket.id },
                { socket_id: null }
            );
        } catch (err) {
            console.error("Error removing socket ID:", err);
        }
    });
};

module.exports = userConnect;