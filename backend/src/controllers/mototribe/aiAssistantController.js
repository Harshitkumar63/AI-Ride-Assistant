const { chat } = require("../../services/mototribe/aiAssistantService");
const AppError = require("../../utils/AppError");

/**
 * POST /api/mototribe/ai-assistant/chat
 *
 * Handles a single chat message from the user, sends it to the AI assistant,
 * and returns the AI response.
 *
 * Request body:
 *   - message (string, required): The user's message
 *   - history (array, optional): Previous conversation [{role, content}]
 *   - context (object, optional): { rideId, latitude, longitude }
 *
 * Response:
 *   - status: "success"
 *   - data.reply: The AI assistant's text response
 *   - data.toolsUsed: Array of tool names the AI used
 */
const chatWithAssistant = async (req, res, next) => {
  try {
    const { message, history, context } = req.body;

    // Validate required fields
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return next(new AppError("Message is required and must be a non-empty string.", 400));
    }

    if (message.trim().length > 2000) {
      return next(new AppError("Message cannot exceed 2000 characters.", 400));
    }

    // Validate history format if provided
    const conversationHistory = [];
    if (Array.isArray(history)) {
      for (const msg of history) {
        if (
          msg &&
          typeof msg.role === "string" &&
          typeof msg.content === "string" &&
          (msg.role === "user" || msg.role === "assistant")
        ) {
          conversationHistory.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }

      // Limit history to last 20 messages to prevent excessive token usage
      if (conversationHistory.length > 20) {
        conversationHistory.splice(0, conversationHistory.length - 20);
      }
    }

    // Extract context (optional location, rideId)
    const chatContext = {};
    if (context && typeof context === "object") {
      if (typeof context.latitude === "number" && typeof context.longitude === "number") {
        chatContext.latitude = context.latitude;
        chatContext.longitude = context.longitude;
      }
      if (context.rideId) {
        chatContext.rideId = context.rideId;
      }
    }

    // Get the authenticated user's ID
    const userId = req.user?._id || req.user?.id || null;

    // Process through AI service
    const result = await chat(
      message.trim(),
      conversationHistory,
      userId,
      chatContext
    );

    res.status(200).json({
      status: "success",
      data: {
        reply: result.reply,
        toolsUsed: result.toolsUsed,
      },
    });
  } catch (error) {
    // If it's already an AppError, pass it through
    if (error.statusCode) {
      return next(error);
    }

    console.error("[AI Assistant Error]", error.message);

    // Handle Gemini-specific errors gracefully
    if (error.message?.includes("API key")) {
      return next(
        new AppError("AI Assistant is temporarily unavailable. API configuration issue.", 503)
      );
    }

    if (error.message?.includes("quota") || error.message?.includes("rate")) {
      return next(
        new AppError("AI Assistant is temporarily busy. Please try again in a moment.", 429)
      );
    }

    return next(
      new AppError("AI Assistant encountered an error. Please try again.", 500)
    );
  }
};

module.exports = {
  chatWithAssistant,
};
