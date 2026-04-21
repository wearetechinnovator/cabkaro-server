const router = require("express").Router();
const driverController = require("../controllers/driver.controller");
const authMiddleware = require("../middleware/auth.middleware.js");


router
    .route("/get/:id")
    .get(authMiddleware, driverController.getDriverById)

router
    .route("/update-profile-img")
    .patch(authMiddleware, driverController.updateProfileImg)

router
    .route("/update-location")
    .patch(authMiddleware, driverController.updateLocatoin)

router
    .route("/update-driver")
    .post(authMiddleware, driverController.addDriver); // Add and Update Driver;

router
    .route("/delete/:id")
    .delete(authMiddleware, driverController.deleteDriverById) // Delete Driver by ID

router
    .route("/vendor/get")
    .get(authMiddleware, driverController.getVendorDriver) // Get all drivers of a vendor



module.exports = router;