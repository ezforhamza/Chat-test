// src/services/subscriptionService.js
import { baseService } from "./baseService";

export const subscriptionService = {
  // Subscribe to new messages in a conversation
  subscribeToMessages(conversationId, callback) {
    // Create a unique channel name to avoid conflicts
    const channelName = `messages_${conversationId}_${Date.now()}`;
    console.log(`Creating message subscription on channel: ${channelName}`);

    return baseService.supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen for all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log("Message subscription payload:", payload);
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log(`Message subscription status (${channelName}):`, status);
      });
  },

  // Subscribe to typing indicators
  subscribeToTypingIndicators(conversationId, callback) {
    // Create a unique channel name to avoid conflicts
    const channelName = `typing_${conversationId}_${Date.now()}`;
    console.log(`Creating typing subscription on channel: ${channelName}`);

    return baseService.supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen for all events
          schema: "public",
          table: "typing_indicators",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log("Typing subscription payload:", payload);
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log(`Typing subscription status (${channelName}):`, status);
      });
  },
};
