const jwt = require("jsonwebtoken");
const router = require('express').Router();
const userRoute = require("./user.route");
const driverRoute = require("./driver.route");
const rideRoute = require("./ride.route");
const vendorRoute = require("./vendor.route");
const vehicleRoute = require("./vehicle.route");


router.use("/user", userRoute);
router.use("/driver", driverRoute);
router.use("/ride", rideRoute);
router.use("/vendor", vendorRoute);
router.use("/vehicles", vehicleRoute);


router.use("/auth/check-token", (req, res) => {
    const { token } = req.body;
    if (!token)
        return res.status(400).json({ err: "token required" })

    try {
        const decoded = jwt.verify(token, process.env.TOKEN_HASH);
        if (!decoded) {
            return res.status(500).json({ err: "Invalid token" })
        }

        return res.status(200).json({ msg: "success" })
    } catch (err) {
        console.log(err);
        return res.status(500).json({ err: "Something went wrong" })
    }
})



module.exports = router;