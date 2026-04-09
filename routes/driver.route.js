const router = require("express").Router();
const driverController = require("../controllers/driver.controller");
const authMiddleware = require("../middleware/auth.middleware.js");


router
    .route("/register")
    .post(driverController.register)

router
    .route("/login")
    .post(driverController.login)

router
    .route("/verify-otp")
    .post(driverController.verifyOTP)

router
    .route("/get/:id")
    .get(authMiddleware, driverController.getDriver)

router
    .route("/update")
    .patch(authMiddleware, driverController.update)

router
    .route("/change-password")
    .patch(authMiddleware, driverController.changePassword)

router
    .route("/update-profile-img")
    .patch(authMiddleware, driverController.updateProfileImg)

router
    .route("/update-location")
    .patch(authMiddleware, driverController.updateLocatoin)

router
    .route("/toggle-availability")
    .patch(authMiddleware, driverController.toggleAvailability)



module.exports = router;