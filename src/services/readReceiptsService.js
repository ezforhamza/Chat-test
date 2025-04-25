// src/services/readReceiptsService.js
import { baseService } from "./baseService";

export const readReceiptsService = {
  // Mark a message as read
  async markMessageAsRead(messageId, userId) {
    try {
      // Check if already read
      const { data: existing, error: existingError } =
        await baseService.supabase
          .from("message_reads")
          .select("*")
          .eq("message_id", messageId)
          .eq("user_id", userId)
          .maybeSingle();

      if (existingError) throw existingError;

      // If already read, no need to update
      if (existing) return true;

      // Insert new read receipt
      const { error } = await baseService.supabase
        .from("message_reads")
        .insert({
          message_id: messageId,
          user_id: userId,
          read_at: new Date().toISOString(),
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error marking message as read:", error);
      return false;
    }
  },

  // Mark all messages in a conversation as read
  async markConversationAsRead(conversationId, userId) {
    try {
      // Get all unread messages in the conversation sent by others
      const { data: messages, error: messagesError } =
        await baseService.supabase
          .from("chat_messages")
          .select("id")
          .eq("conversation_id", conversationId)
          .neq("sender_id", userId)
          .eq("is_deleted", false);

      if (messagesError) throw messagesError;

      // If no messages, return early
      if (!messages || messages.length === 0) return true;

      // Get already read messages
      const { data: existingReads, error: existingError } =
        await baseService.supabase
          .from("message_reads")
          .select("message_id")
          .eq("user_id", userId)
          .in(
            "message_id",
            messages.map((m) => m.id)
          );

      if (existingError) throw existingError;

      // Filter out already read messages
      const existingReadIds = new Set(
        existingReads?.map((r) => r.message_id) || []
      );
      const unreadMessages = messages.filter((m) => !existingReadIds.has(m.id));

      // If all messages are already read, return early
      if (unreadMessages.length === 0) return true;

      // Insert new read receipts
      const { error } = await baseService.supabase.from("message_reads").insert(
        unreadMessages.map((m) => ({
          message_id: m.id,
          user_id: userId,
          read_at: new Date().toISOString(),
        }))
      );

      if (error) throw error;

      // Update conversation participant's last read info
      const { error: updateError } = await baseService.supabase
        .from("conversation_participants")
        .update({
          last_read_at: new Date().toISOString(),
          last_read_message_id: messages[messages.length - 1].id,
        })
        .eq("conversation_id", conversationId)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      return true;
    } catch (error) {
      console.error("Error marking conversation as read:", error);
      return false;
    }
  },

  // Get read receipts for a message
  async getMessageReadReceipts(messageId) {
    try {
      const { data, error } = await baseService.supabase
        .from("message_reads")
        .select(
          `
          user_id,
          read_at,
          users!inner(first_name, last_name, avatar_url)
        `
        )
        .eq("message_id", messageId);

      if (error) throw error;

      // Transform to a more usable format
      return (
        data?.map((receipt) => ({
          userId: receipt.user_id,
          readAt: receipt.read_at,
          userName: `${receipt.users.first_name} ${receipt.users.last_name}`,
          avatarUrl: receipt.users.avatar_url,
        })) || []
      );
    } catch (error) {
      console.error("Error getting message read receipts:", error);
      return [];
    }
  },

  // Get read status for multiple messages in one query
  async getReadReceiptsForMessages(messageIds, conversationId) {
    try {
      if (!messageIds || messageIds.length === 0) return {};

      // Get all read receipts for these messages
      const { data, error } = await baseService.supabase
        .from("message_reads")
        .select(
          `
          message_id,
          user_id,
          read_at
        `
        )
        .in("message_id", messageIds);

      if (error) throw error;

      // Get all participants in the conversation except the sender
      const { data: participants, error: participantsError } =
        await baseService.supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", conversationId);

      if (participantsError) throw participantsError;

      // Transform to a map of message_id -> read status
      const result = {};
      messageIds.forEach((messageId) => {
        // Get all receipts for this message
        const receipts = data?.filter((r) => r.message_id === messageId) || [];
        // Calculate how many participants have read the message
        const readCount = new Set(receipts.map((r) => r.user_id)).size;
        const totalParticipants = participants.length;

        result[messageId] = {
          readCount,
          totalParticipants,
          isRead: readCount > 0,
          isReadByAll: readCount >= totalParticipants - 1, // -1 for the sender
          readReceipts: receipts.map((r) => ({
            userId: r.user_id,
            readAt: r.read_at,
          })),
        };
      });

      return result;
    } catch (error) {
      console.error("Error getting read receipts for messages:", error);
      return {};
    }
  },

  // Create a function to efficiently batch process message reads
  async processBulkMessageReads(messageIds, userId) {
    try {
      if (!messageIds || messageIds.length === 0) return true;

      // Find which messages are already read
      const { data: existingReads, error: existingError } =
        await baseService.supabase
          .from("message_reads")
          .select("message_id")
          .eq("user_id", userId)
          .in("message_id", messageIds);

      if (existingError) throw existingError;

      // Filter out already read messages
      const existingReadIds = new Set(
        existingReads?.map((r) => r.message_id) || []
      );
      const unreadMessageIds = messageIds.filter(
        (id) => !existingReadIds.has(id)
      );

      // If all messages are already read, return early
      if (unreadMessageIds.length === 0) return true;

      // Insert new read receipts in bulk
      const { error } = await baseService.supabase.from("message_reads").insert(
        unreadMessageIds.map((messageId) => ({
          message_id: messageId,
          user_id: userId,
          read_at: new Date().toISOString(),
        }))
      );

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error processing bulk message reads:", error);
      return false;
    }
  },
};
