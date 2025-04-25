// src/context/ChatContext.jsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { chatService } from "../services/chatService";

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [currentUserId, setCurrentUserId] = useState("");
  const [otherUserId, setOtherUserId] = useState("");
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});

  // Function to set the current user
  const setUser = useCallback((userId) => {
    setCurrentUserId(userId);
  }, []);

  // Function to set the other user for 1:1 chat
  const setOtherUser = useCallback((userId) => {
    setOtherUserId(userId);
  }, []);

  // Load messages for a conversation - define this first to fix the circular dependency
  const loadMessages = useCallback(
    async (conversationId) => {
      if (!currentUserId || !conversationId) return;

      try {
        setLoading(true);
        setError(null); // Clear previous errors
        const data = await chatService.getConversationMessages(
          conversationId,
          currentUserId
        );
        setMessages(data);
        return data;
      } catch (err) {
        console.error("Error loading messages:", err);
        setError(err.message || "Failed to load messages");
        return [];
      } finally {
        setLoading(false);
      }
    },
    [currentUserId]
  );

  // Load user conversations
  const loadConversations = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      setError(null); // Clear previous errors
      const data = await chatService.getUserConversations(currentUserId);
      setConversations(data);
    } catch (err) {
      console.error("Error loading conversations:", err);
      setError(err.message || "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Create or get conversation with another user
  const createOrGetConversation = useCallback(async () => {
    if (!currentUserId || !otherUserId) return;

    try {
      setLoading(true);
      setError(null); // Clear previous errors
      const conversationId = await chatService.createOrGetConversation(
        currentUserId,
        otherUserId
      );
      setCurrentConversation(conversationId);
      await loadMessages(conversationId);
      return conversationId;
    } catch (err) {
      console.error("Error creating conversation:", err);
      setError(err.message || "Failed to create or get conversation");
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentUserId, otherUserId, loadMessages]);

  // Send a message
  const sendMessage = useCallback(
    async (content, messageType = "text", replyToId = null) => {
      if (!currentUserId || !currentConversation) return null;

      try {
        setLoading(true);
        setError(null); // Clear previous errors

        const messageId = await chatService.sendMessage(
          currentConversation,
          currentUserId,
          content,
          messageType,
          replyToId
        );

        // If successful, reload messages
        if (messageId) {
          await loadMessages(currentConversation);
        }

        return messageId;
      } catch (err) {
        console.error("Error sending message:", err);
        const errorMessage = err.message || "Failed to send message";
        setError(errorMessage);

        // Try to provide a more helpful error message
        if (errorMessage.includes("not a participant")) {
          setError(
            "You don't have permission to send messages in this conversation."
          );
        }

        return null;
      } finally {
        setLoading(false);
      }
    },
    [currentUserId, currentConversation, loadMessages]
  );

  // Toggle reaction on a message
  const toggleReaction = useCallback(
    async (messageId, reaction) => {
      if (!currentUserId) return;

      try {
        setError(null); // Clear previous errors
        await chatService.toggleReaction(messageId, currentUserId, reaction);
        await loadMessages(currentConversation);
      } catch (err) {
        console.error("Error toggling reaction:", err);
        setError(err.message || "Failed to toggle reaction");
      }
    },
    [currentUserId, currentConversation, loadMessages]
  );

  // Delete a message
  const deleteMessage = useCallback(
    async (messageId, deleteForEveryone = false) => {
      if (!currentUserId) return;

      try {
        setError(null); // Clear previous errors
        await chatService.deleteMessage(
          messageId,
          currentUserId,
          deleteForEveryone
        );
        await loadMessages(currentConversation);
      } catch (err) {
        console.error("Error deleting message:", err);
        setError(err.message || "Failed to delete message");
      }
    },
    [currentUserId, currentConversation, loadMessages]
  );

  // Update typing status
  const updateTypingStatus = useCallback(
    async (isTyping) => {
      if (!currentUserId || !currentConversation) return;

      try {
        await chatService.updateTypingStatus(
          currentConversation,
          currentUserId,
          isTyping
        );
      } catch (err) {
        console.error("Error updating typing status:", err);
        // Don't set error state for typing status to avoid cluttering the UI
      }
    },
    [currentUserId, currentConversation]
  );

  // Subscribe to messages when conversation changes
  useEffect(() => {
    if (!currentConversation) return;

    // Subscribe to new messages
    const subscription = chatService.subscribeToMessages(
      currentConversation,
      (payload) => {
        loadMessages(currentConversation);
      }
    );

    // Subscribe to typing indicators
    const typingSubscription = chatService.subscribeToTypingIndicators(
      currentConversation,
      (payload) => {
        if (payload.eventType === "INSERT") {
          setTypingUsers((prev) => ({
            ...prev,
            [payload.new.user_id]: true,
          }));
        } else if (payload.eventType === "DELETE") {
          setTypingUsers((prev) => {
            const copy = { ...prev };
            delete copy[payload.old.user_id];
            return copy;
          });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      typingSubscription.unsubscribe();
    };
  }, [currentConversation, loadMessages]);

  // Load conversations when user changes
  useEffect(() => {
    if (currentUserId) {
      loadConversations();
    }
  }, [currentUserId, loadConversations]);

  return (
    <ChatContext.Provider
      value={{
        currentUserId,
        otherUserId,
        conversations,
        currentConversation,
        messages,
        loading,
        error,
        typingUsers,
        setUser,
        setOtherUser,
        loadConversations,
        createOrGetConversation,
        loadMessages,
        sendMessage,
        toggleReaction,
        deleteMessage,
        updateTypingStatus,
        setCurrentConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
