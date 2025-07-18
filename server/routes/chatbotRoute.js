const express = require("express");
const router = express.Router();
const chatbotController = require("../controllers/chatbotController");

router.post("/generate-gemini", chatbotController.generateGemini);

module.exports = router;
