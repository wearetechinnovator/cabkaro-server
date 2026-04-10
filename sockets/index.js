const { Server } = require("socket.io");
const nearRideHandler = require("./nearRide.js");
const socketAuth = require("../middleware/socketAuth.middleware.js");


let io;
const initializeSockets = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.use(socketAuth);


    io.on("connection", (socket) => {
        console.log("Connected:", socket.id);


        // Handle near ride requests from drivers
        nearRideHandler(socket, io);


        socket.on("disconnect", () => {
            console.log("Client disconnected: ", socket.id);
        })
    });
};


const getIO = () => {
    if (!io) {
        console.log("No Socket.io instance found, initializing...");
    }  
    return io;
}


module.exports = { initializeSockets, socketIO: io, getIO };