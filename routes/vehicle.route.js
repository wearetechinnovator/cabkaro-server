const router = require("express").Router();
const vehicleController = require("../controllers/vehicle.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");



router
    .route("/add")
    .post(authMiddleware, vehicleController.addVehicle);

router
    .route("/get/:id")
    .get(authMiddleware, vehicleController.getVehicleById);

router
    .route("/delete/:id")
    .delete(authMiddleware, vehicleController.deleteVehicleById);

//For vendor to get all his vehicles.
router
    .route("/vendor/get")
    .get(authMiddleware, vehicleController.getVendorVehicles);

// Get available vehicles for a location for users.
router
    .route("/location/get")
    .post(authMiddleware, vehicleController.getAvailableVehicleForCurrentLocation);

router
    .route("/availability/update")
    .post(authMiddleware, vehicleController.addVehicleAvailability);




module.exports = router;