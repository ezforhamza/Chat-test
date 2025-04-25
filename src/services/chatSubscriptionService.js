// src/services/chatSubscriptionService.js
import { baseService } from "./baseService";

// Map to track active subscriptions
const activeSubscriptions = new Map();
// Map to track callbacks for each conversation
const conversationCallbacks = new Map();
// Map to track polling intervals for each conversation
const pollingIntervals = new Map();

// Flag to enable fallback polling
const ENABLE_POLLING = true;
// Polling interval in milliseconds
const POLLING_INTERVAL = 3000;

export const chatSubscriptionService = {
  // Register a callback for a specific conversation
  registerCallback(conversationId, componentId, callback) {
    console.log(
      `[SUB SERVICE] Registering callback for ${componentId} on conversation ${conversationId}`
    );

    // Initialize the callbacks map for this conversation if it doesn't exist
    if (!conversationCallbacks.has(conversationId)) {
      conversationCallbacks.set(conversationId, new Map());
    }

    // Store the callback with the component ID
    const callbacksForConversation = conversationCallbacks.get(conversationId);
    callbacksForConversation.set(componentId, callback);

    // Set up subscription if it doesn't exist yet
    if (!activeSubscriptions.has(conversationId)) {
      this.createSubscription(conversationId);

      // Set up polling as a fallback mechanism
      if (ENABLE_POLLING && !pollingIntervals.has(conversationId)) {
        this.setupPolling(conversationId);
      }
    }

    return {
      unsubscribe: () => {
        this.unregisterCallback(conversationId, componentId);
      },
    };
  },

  // Unregister a callback
  unregisterCallback(conversationId, componentId) {
    console.log(
      `[SUB SERVICE] Unregistering callback for ${componentId} on conversation ${conversationId}`
    );

    if (conversationCallbacks.has(conversationId)) {
      const callbacksForConversation =
        conversationCallbacks.get(conversationId);
      callbacksForConversation.delete(componentId);

      // If no more callbacks for this conversation, clean up subscription and polling
      if (callbacksForConversation.size === 0) {
        this.removeSubscription(conversationId);
        this.removePolling(conversationId);
        conversationCallbacks.delete(conversationId);
      }
    }
  },

  // Set up periodic polling as a fallback for realtime subscriptions
  setupPolling(conversationId) {
    console.log(
      `[SUB SERVICE] Setting up polling for conversation ${conversationId}`
    );

    // Create polling interval
    const intervalId = setInterval(() => {
      try {
        // Check if we still have callbacks for this conversation
        if (!conversationCallbacks.has(conversationId)) {
          this.removePolling(conversationId);
          return;
        }

        console.log(
          `[SUB SERVICE] Polling for updates on conversation ${conversationId}`
        );

        // Trigger a special poll event
        this.notifyCallbacks(conversationId, { type: "poll" });
      } catch (error) {
        console.error(
          `[SUB SERVICE] Error polling conversation ${conversationId}:`,
          error
        );
      }
    }, POLLING_INTERVAL);

    pollingIntervals.set(conversationId, intervalId);
  },

  // Remove polling for a conversation
  removePolling(conversationId) {
    if (pollingIntervals.has(conversationId)) {
      console.log(
        `[SUB SERVICE] Removing polling for conversation ${conversationId}`
      );
      clearInterval(pollingIntervals.get(conversationId));
      pollingIntervals.delete(conversationId);
    }
  },

  // Create a new Supabase subscription for a conversation
  createSubscription(conversationId) {
    console.log(
      `[SUB SERVICE] Creating subscription for conversation ${conversationId}`
    );

    // Create message subscription
    const messageChannel = baseService.supabase
      .channel(`messages_${conversationId}_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log(
            `[SUB SERVICE] Message event for conversation ${conversationId}:`,
            payload
          );
          this.notifyCallbacks(conversationId, { type: "message", payload });
        }
      )
      .subscribe((status) => {
        console.log(
          `[SUB SERVICE] Message subscription status for ${conversationId}:`,
          status
        );
      });

    // Create typing subscription
    const typingChannel = baseService.supabase
      .channel(`typing_${conversationId}_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log(
            `[SUB SERVICE] Typing event for conversation ${conversationId}:`,
            payload
          );
          this.notifyCallbacks(conversationId, { type: "typing", payload });
        }
      )
      .subscribe((status) => {
        console.log(
          `[SUB SERVICE] Typing subscription status for ${conversationId}:`,
          status
        );
      });

    // Store both subscription channels
    activeSubscriptions.set(conversationId, {
      messageChannel,
      typingChannel,
    });
  },

  // Remove a subscription
  removeSubscription(conversationId) {
    console.log(
      `[SUB SERVICE] Removing subscription for conversation ${conversationId}`
    );

    if (activeSubscriptions.has(conversationId)) {
      const { messageChannel, typingChannel } =
        activeSubscriptions.get(conversationId);

      if (messageChannel) {
        messageChannel.unsubscribe();
      }

      if (typingChannel) {
        typingChannel.unsubscribe();
      }

      activeSubscriptions.delete(conversationId);
    }
  },

  // Notify all registered callbacks for a conversation
  notifyCallbacks(conversationId, event) {
    if (conversationCallbacks.has(conversationId)) {
      const callbacksForConversation =
        conversationCallbacks.get(conversationId);

      console.log(
        `[SUB SERVICE] Notifying ${callbacksForConversation.size} callbacks for conversation ${conversationId}`
      );

      callbacksForConversation.forEach((callback, componentId) => {
        console.log(`[SUB SERVICE] Notifying callback for ${componentId}`);
        try {
          callback(event);
        } catch (error) {
          console.error(
            `[SUB SERVICE] Error in callback for ${componentId}:`,
            error
          );
        }
      });
    }
  },
};
