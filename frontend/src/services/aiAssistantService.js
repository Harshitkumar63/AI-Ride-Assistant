import apiClient from "./apiClient";

/**
 * Service to interact with MotoTribe AI Ride Assistant backend.
 */
export const aiAssistantService = {
  /**
   * Send a chat message to the AI Ride Assistant.
   *
   * @param {string} message - User query/prompt
   * @param {Array<{role: string, content: string}>} history - Previous messages
   * @param {object} context - Optional context { rideId, latitude, longitude }
   * @returns {Promise<{reply: string, toolsUsed: string[]}>}
   */
  async sendMessage(message, history = [], context = {}) {
    try {
      const response = await apiClient.post("/api/mototribe/ai-assistant/chat", {
        message,
        history,
        context,
      });

      if (response.data && response.data.status === "success") {
        return response.data.data;
      }

      throw new Error(response.data?.message || "Failed to receive response from AI Assistant.");
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Unable to reach the AI Ride Assistant. Please check your connection.";
      throw new Error(errorMessage);
    }
  },
};

export default aiAssistantService;
