// src/services/messageService.js
import { baseService } from "./baseService";

export const messageService = {
  // Get messages for a conversation
  async getConversationMessages(
    conversationId,
    userId,
    limit = 50,
    offset = 0
  ) {
    try {
      const { data, error } = await baseService.supabase.rpc(
        "get_conversation_messages",
        {
          p_conversation_id: conversationId,
          p_user_id: userId,
          p_limit_val: limit,
          p_offset_val: offset,
        }
      );

      if (error) throw error;

      const transformedData =
        data?.map((msg) => ({
          message_id: msg.message_id,
          conversation_id: msg.conversation_id,
          sender_id: msg.sender_id,
          sender_name: msg.sender_name,
          content: msg.content,
          created_at: msg.created_at,
          updated_at: msg.updated_at,
          edited_at: msg.edited_at,
          is_deleted: msg.is_deleted,
          message_type: msg.message_type,
          reply_to_id: msg.reply_to_id,
          reply_to_content: msg.reply_to_content,
          reply_to_sender: msg.reply_to_sender,
          reactions:
            typeof msg.reactions === "string"
              ? JSON.parse(msg.reactions)
              : msg.reactions,
        })) || [];

      return transformedData;
    } catch (error) {
      return baseService.handleError(error, "getConversationMessages");
    }
  },

  // Send a message
  async sendMessage(
    conversationId,
    senderId,
    content,
    messageType = "text",
    replyToId = null
  ) {
    try {
      const { data, error } = await baseService.supabase.rpc("send_message", {
        p_conversation_id: conversationId,
        p_sender_id: senderId,
        p_content: content,
        p_message_type: messageType,
        p_reply_to_id: replyToId,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      return baseService.handleError(error, "sendMessage");
    }
  },

  // Edit a message
  async editMessage(messageId, userId, newContent) {
    try {
      const { data, error } = await baseService.supabase.rpc("edit_message", {
        p_message_id: messageId,
        p_user_id: userId,
        p_new_content: newContent,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      return baseService.handleError(error, "editMessage");
    }
  },

  // Delete a message
  async deleteMessage(messageId, userId, deleteForEveryone = false) {
    try {
      const { data, error } = await baseService.supabase.rpc("delete_message", {
        p_message_id: messageId,
        p_user_id: userId,
        p_delete_for_everyone: deleteForEveryone,
        p_hard_delete: false,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      return baseService.handleError(error, "deleteMessage");
    }
  },
};
