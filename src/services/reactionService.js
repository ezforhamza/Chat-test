// src/services/reactionService.js
import { baseService } from "./baseService";

export const reactionService = {
  // Toggle reaction on a message
  async toggleReaction(messageId, userId, reaction) {
    try {
      const { data, error } = await baseService.supabase.rpc(
        "toggle_message_reaction",
        {
          p_message_id: messageId,
          p_user_id: userId,
          p_reaction: reaction,
        }
      );

      if (error) throw error;
      return data;
    } catch (error) {
      return baseService.handleError(error, "toggleReaction");
    }
  },
};
