const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.post("/register", userController.register);
router.post("/login", userController.login);
router.post("/userData", userController.userData);
router.post("/updateUserData", userController.updateUserData);
router.post("/uploadProfilePic", userController.uploadProfilePic);

module.exports = router;
