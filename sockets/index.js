const { Server } = require("socket.io");
const createRide = require("./createRide.js");
const socketAuth = require("../middleware/socketAuth.middleware.js");
const driverConnect = require("./driverConnect.js");
const userConnect = require("./userConnect.js");


let io;
const initializeSockets = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PATCH"]
        }
    });

    io.use(socketAuth); // Check Auth;


    io.on("connection", (socket) => {
        // Connect user and driver;
        driverConnect(socket, io);
        userConnect(socket, io);

        // Operations;
        createRide(socket, io);
    });
};


const getIO = () => {
    if (!io) {
        console.log("No Socket.io instance found, initializing...");
    }  
    return io;
}


module.exports = { initializeSockets, socketIO: io, getIO };