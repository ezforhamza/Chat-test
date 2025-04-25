// src/services/typingService.js
import { baseService } from "./baseService";

export const typingService = {
  // Update typing status
  async updateTypingStatus(conversationId, userId, isTyping) {
    try {
      const { data, error } = await baseService.supabase.rpc(
        "update_typing_status",
        {
          p_conversation_id: conversationId,
          p_user_id: userId,
          p_is_typing: isTyping,
        }
      );

      if (error) throw error;
      return data;
    } catch (error) {
      // Don't throw for typing errors, just log them
      console.error("Error updating typing status:", error);
      return false;
    }
  },
};
