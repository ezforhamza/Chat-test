// src/services/conversationService.js
import { baseService } from "./baseService";

export const conversationService = {
  // Get or create a conversation between two users
  async createOrGetConversation(userId1, userId2) {
    try {
      const { data, error } = await baseService.supabase.rpc(
        "create_or_get_one_to_one_conversation",
        {
          p_user_id1: userId1,
          p_user_id2: userId2,
        }
      );

      if (error) throw error;
      return data;
    } catch (error) {
      return baseService.handleError(error, "createOrGetConversation");
    }
  },

  // Get all conversations for a user
  async getUserConversations(userId) {
    try {
      const { data, error } = await baseService.supabase.rpc(
        "get_user_conversations",
        {
          p_user_id: userId,
        }
      );

      if (error) throw error;

      const transformedData =
        data?.map((conv) => ({
          conversation_id: conv.conversation_id,
          conversation_type: conv.conversation_type,
          conversation_title: conv.conversation_title,
          other_participant_id: conv.other_participant_id,
          other_participant_name: conv.other_participant_name,
          last_message_id: conv.last_message_id,
          last_message_content: conv.last_message_content,
          unread_count: conv.unread_count,
          is_muted: conv.is_muted,
          last_message_time: conv.last_message_time,
        })) || [];

      return transformedData;
    } catch (error) {
      return baseService.handleError(error, "getUserConversations");
    }
  },

  // Test chat system functionality
  async testChatSystem() {
    try {
      const { data, error } = await baseService.supabase.rpc(
        "chat_system_test"
      );

      if (error) throw error;
      return data;
    } catch (error) {
      return baseService.handleError(error, "testChatSystem");
    }
  },
};
