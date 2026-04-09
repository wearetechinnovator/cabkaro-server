const router = require('express').Router();
const userRoute = require("./user.route");
const driverRoute = require("./driver.route");
const rideRoute = require("./ride.route");


router.use("/user", userRoute);
router.use("/driver", driverRoute);
router.use("/ride", rideRoute);



module.exports = router;