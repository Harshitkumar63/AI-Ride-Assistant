const express = require("express");
const { chatWithAssistant } = require("../../controllers/mototribe/aiAssistantController");
const { optionalAuth } = require("../../middleware/authMiddleware");

const router = express.Router();

// Allow both authenticated riders and guests
router.use(optionalAuth);

// POST /api/mototribe/ai-assistant/chat - Send a message to the AI ride assistant
router.post("/ai-assistant/chat", chatWithAssistant);

module.exports = router;

