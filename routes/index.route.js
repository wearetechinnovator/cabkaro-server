const router = require('express').Router();
const userRoute = require("./user.route");
const driverRoute = require("./driver.route");


router.use("/user", userRoute);
router.use("/driver", driverRoute);



module.exports = router;