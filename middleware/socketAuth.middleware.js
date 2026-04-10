const jwt = require("jsonwebtoken");


const socketAuth = async (socket, next) => {
    try {
        let token;
        if(socket.handshake.query && socket.handshake.query.token) {
            token = socket.handshake.query.token;
        }
        else if(socket.handshake.auth && socket.handshake.auth.token) {
            token = socket.handshake.auth.token;
        }

        if (!token) {
            return next(new Error("No Token Provided"));
        }

        // Check token is valid or not;
        const decoded = jwt.verify(token, process.env.TOKEN_HASH);
        if (!decoded) {
            return next(new Error("Unauthorized: Invalid token"));
        }

        socket.user = decoded;
        next();
    } catch (error) {
        return next(new Error("Unauthorized users"));
    }

}

module.exports = socketAuth;