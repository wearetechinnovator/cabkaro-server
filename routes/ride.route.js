const router = require("express").Router();
const rideController = require("../controllers/ride.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js")



router
    .route("/create-ride")
    .post(authMiddleware, rideController.createRide);

router
    .route("/edit-ride")
    .patch(authMiddleware, rideController.editRide);

router
    .route("/nearest-rides")
    .get(authMiddleware, rideController.getNearestRide);

router
    .route("/create-ride-nego")
    .post(authMiddleware, rideController.createRideNego);

router
    .route("/accept-ride")
    .post(authMiddleware, rideController.accepetRideByUser);


module.exports = router;