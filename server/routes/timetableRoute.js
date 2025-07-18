const express = require("express");
const router = express.Router();
const timetableController = require("../controllers/timetableController");

router.post("/timetableGen", timetableController.timetableGen);
router.post("/timetableSnapshot", timetableController.timetableSnapshot);

module.exports = router;
