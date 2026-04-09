const router = require("express").Router();
const rideController = require("../controllers/ride.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js")



router
    .route("/create-ride")
    .post(authMiddleware, rideController.createRide);

router
    .route("/nearest-ride")
    .get(authMiddleware, rideController.getNearestRide);


module.exports = router;