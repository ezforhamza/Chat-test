// src/services/chatService.js
// This is a facade that brings together all the specialized services
// to maintain backward compatibility with existing components

import { baseService } from "./baseService";
import { conversationService } from "./conversationService";
import { messageService } from "./messageService";
import { reactionService } from "./reactionService";
import { typingService } from "./typingService";
import { attachmentService } from "./attachmentService";
import { subscriptionService } from "./subscriptionService";
import { readReceiptsService } from "./readReceiptsService";

// Export a combined service that delegates to specialized services
export const chatService = {
  // Conversation methods
  createOrGetConversation: conversationService.createOrGetConversation,
  getUserConversations: conversationService.getUserConversations,
  testChatSystem: conversationService.testChatSystem,

  // Message methods
  sendMessage: messageService.sendMessage,
  editMessage: messageService.editMessage,
  deleteMessage: messageService.deleteMessage,

  // Reaction methods
  toggleReaction: reactionService.toggleReaction,

  // Typing methods
  updateTypingStatus: typingService.updateTypingStatus,

  // Attachment methods
  uploadAttachment: attachmentService.uploadAttachment,
  sendMessageWithAttachment: attachmentService.sendMessageWithAttachment,
  sendVoiceMessage: attachmentService.sendVoiceMessage,
  getMessageAttachments: attachmentService.getMessageAttachments,
  fileToBase64: attachmentService.fileToBase64,

  // Subscription methods
  subscribeToMessages: subscriptionService.subscribeToMessages,
  subscribeToTypingIndicators: subscriptionService.subscribeToTypingIndicators,

  // Read receipt methods
  markMessageAsRead: readReceiptsService.markMessageAsRead,
  markConversationAsRead: readReceiptsService.markConversationAsRead,
  getMessageReadReceipts: readReceiptsService.getMessageReadReceipts,
  getReadReceiptsForMessages: readReceiptsService.getReadReceiptsForMessages,
  processBulkMessageReads: readReceiptsService.processBulkMessageReads,

  // Enhanced get conversation messages with read receipts
  async getConversationMessages(
    conversationId,
    userId,
    limit = 50,
    offset = 0,
    autoMarkAsRead = true
  ) {
    try {
      const { data, error } = await baseService.supabase.rpc(
        "get_conversation_messages",
        {
          p_conversation_id: conversationId,
          p_user_id: userId,
          p_limit_val: limit,
          p_offset_val: offset,
          p_auto_mark_as_read: autoMarkAsRead,
        }
      );

      if (error) throw error;

      // Process read receipts for the loaded messages
      if (data && data.length > 0) {
        // Get any additional read receipt data needed
        try {
          const messageIds = data.map((msg) => msg.message_id);
          const readReceipts =
            await readReceiptsService.getReadReceiptsForMessages(
              messageIds,
              conversationId
            );

          // Enhance messages with read receipt details
          data.forEach((msg) => {
            if (readReceipts[msg.message_id]) {
              msg.readReceipts = readReceipts[msg.message_id].readReceipts;
              msg.isReadByAll = readReceipts[msg.message_id].isReadByAll;
            }
          });
        } catch (readError) {
          console.warn(
            "Error enhancing messages with read receipts:",
            readError
          );
          // Continue with basic message data even if read receipts fail
        }
      }

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
          read_by_count: msg.read_by_count || 0,
          is_read: msg.is_read || false,
          readReceipts: msg.readReceipts || [],
          isReadByAll: msg.isReadByAll || false,
        })) || [];

      return transformedData;
    } catch (error) {
      console.error("Error in getConversationMessages:", error);
      throw error;
    }
  },
};
