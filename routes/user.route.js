const router = require("express").Router();
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth.middleware.js")


router
    .route("/register")
    .post(userController.register)

router
    .route("/login")
    .post(userController.login)

router
    .route("/verify-otp")
    .post(userController.verifyOTP)

router
    .route("/get/:id")
    .get(authMiddleware, userController.getUser)

router
    .route("/update")
    .patch(authMiddleware, userController.update)

router
    .route("/change-password")
    .patch(authMiddleware, userController.changePassword)

router
    .route("/update-profile-img")
    .patch(authMiddleware, userController.updateProfileImg)

router
    .route("/update-location")
    .patch(authMiddleware, userController.updateLocatoin)



module.exports = router;