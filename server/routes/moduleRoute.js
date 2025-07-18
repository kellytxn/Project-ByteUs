const express = require("express");
const router = express.Router();
const moduleController = require("../controllers/moduleController");

router.post("/getModules", moduleController.getModules);
router.post("/createModule", moduleController.createModule);
router.post("/updateModule", moduleController.updateModule);
router.post("/deleteModule", moduleController.deleteModule);

module.exports = router;
