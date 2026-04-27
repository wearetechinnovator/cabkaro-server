const router = require("express").Router();
const vendorController = require("../controllers/vendor.controller");
const authMiddleware = require("../middleware/auth.middleware.js");



router
    .route("/login")
    .post(vendorController.login);

router
    .route("/verify-otp")
    .post(vendorController.verifyOTP);

router
    .route("/update-profile")
    .post(authMiddleware, vendorController.updateProfile);

router
    .route("/get-profile")
    .get(authMiddleware, vendorController.getProfile);



module.exports = router;