// src/components/SingleChatPanel.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { chatService } from "../services/chatService";
import { chatSubscriptionService } from "../services/chatSubscriptionService";
import FileUploadButton from "./FileUploadButton";
import FilePreview from "./FilePreview";
import MessageAttachment from "./MessageAttachment";
import MessageStatus from "./MessageStatus";

export const SingleChatPanel = ({ userId, otherUserId, panelTitle }) => {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [lastMessageId, setLastMessageId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [messageAttachments, setMessageAttachments] = useState({});
  const [visibleMessageIds, setVisibleMessageIds] = useState(new Set());

  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const subscriptionRef = useRef(null);
  const readTimeoutRef = useRef(null);
  const componentId = useRef(`${panelTitle}_${userId}_${Date.now()}`).current;
  const isLoadingRef = useRef(false);

  // Create or get conversation
  const initializeConversation = async () => {
    try {
      setLoading(true);
      setError(null);
      const conversationId = await chatService.createOrGetConversation(
        userId,
        otherUserId
      );
      setConversation(conversationId);
      await loadMessages(conversationId);

      // Register with the shared subscription service
      setupSubscription(conversationId);

      return conversationId;
    } catch (err) {
      console.error(`[${panelTitle}] Error initializing conversation:`, err);
      setError(err.message || "Failed to initialize conversation");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Load messages - memoized to prevent recreating it in useEffect
  const loadMessages = useCallback(
    async (conversationId) => {
      if (!userId || !conversationId || isLoadingRef.current) return;

      try {
        isLoadingRef.current = true;
        setLoading(true);
        console.log(
          `[${panelTitle}] Loading messages for conversation ${conversationId}`
        );

        const data = await chatService.getConversationMessages(
          conversationId,
          userId,
          50,
          0,
          true // Auto mark as read
        );

        console.log(`[${panelTitle}] Loaded ${data.length} messages`);

        // Sort messages by created_at timestamp (oldest first)
        const sortedMessages = [...data].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // Update last message ID for tracking
        if (sortedMessages.length > 0) {
          const newLastMessageId =
            sortedMessages[sortedMessages.length - 1].message_id;
          setLastMessageId(newLastMessageId);
        }

        setMessages(sortedMessages);
        return sortedMessages;
      } catch (err) {
        console.error(`[${panelTitle}] Error loading messages:`, err);
        setError(err.message || "Failed to load messages");
        return [];
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    },
    [userId, panelTitle]
  );

  // Helper function to check if element is in viewport
  const isElementInViewport = (el) => {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  };

  // Mark visible messages as read
  const markVisibleMessagesAsRead = async (messageIds) => {
    if (!messageIds || messageIds.length === 0) return;

    try {
      console.log(
        `[${panelTitle}] Marking ${messageIds.length} messages as read`
      );
      await chatService.processBulkMessageReads(messageIds, userId);

      // To reflect in UI immediately, update the message objects
      setMessages((prevMessages) =>
        prevMessages.map((message) => {
          if (messageIds.includes(message.message_id) && !message.is_read) {
            return {
              ...message,
              is_read: true,
              read_by_count: message.read_by_count + 1,
            };
          }
          return message;
        })
      );
    } catch (error) {
      console.error(`[${panelTitle}] Error marking messages as read:`, error);
    }
  };

  // Handle message visibility checking
  const handleMessageVisibility = useCallback(() => {
    // Don't process if there are no messages or user is the sender
    if (!messages.length || !conversation) {
      return;
    }

    // Get message elements that need read receipts
    const messageElements = document.querySelectorAll(".message-item");
    const newVisibleIds = new Set(visibleMessageIds);
    let hasChanges = false;

    // Check which messages are in the viewport
    messageElements.forEach((element) => {
      const messageId = element.dataset.messageId;
      const isVisible = isElementInViewport(element);

      // If message is visible, from another user, and not already marked as visible
      if (isVisible && !visibleMessageIds.has(messageId)) {
        const message = messages.find((m) => m.message_id === messageId);
        if (message && message.sender_id !== userId && !message.is_deleted) {
          newVisibleIds.add(messageId);
          hasChanges = true;
        }
      }
    });

    // Update visible IDs if there were changes
    if (hasChanges) {
      setVisibleMessageIds(newVisibleIds);

      // Schedule marking messages as read
      if (readTimeoutRef.current) {
        clearTimeout(readTimeoutRef.current);
      }

      readTimeoutRef.current = setTimeout(() => {
        markVisibleMessagesAsRead(Array.from(newVisibleIds));
      }, 1000); // Wait 1 second before marking as read
    }
  }, [messages, visibleMessageIds, conversation, userId]);

  // Set up subscription through the shared service
  const setupSubscription = (conversationId) => {
    // Clean up any existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    console.log(
      `[${panelTitle}] Setting up subscription for conversation ${conversationId}`
    );

    // Register with the shared subscription service
    subscriptionRef.current = chatSubscriptionService.registerCallback(
      conversationId,
      componentId,
      handleSubscriptionEvent
    );
  };

  // Handle events from the subscription service
  const handleSubscriptionEvent = (event) => {
    console.log(`[${panelTitle}] Received subscription event:`, event);

    if (event.type === "message") {
      // Reload messages when a message event occurs
      if (conversation) {
        loadMessages(conversation);
      }
    } else if (event.type === "typing") {
      // Update typing indicators
      const payload = event.payload;
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
    } else if (event.type === "poll") {
      // Handle polling event
      if (conversation) {
        loadMessages(conversation);
      }
    }
  };

  // Send a message
  const sendMessage = async (
    content,
    messageType = "text",
    replyToId = null
  ) => {
    if (!userId || !conversation) return null;

    try {
      setLoading(true);
      setError(null);

      console.log(
        `[${panelTitle}] Sending message to conversation ${conversation}`
      );

      const messageId = await chatService.sendMessage(
        conversation,
        userId,
        content,
        messageType,
        replyToId
      );

      // Reload messages after sending
      if (messageId) {
        await loadMessages(conversation);
      }

      return messageId;
    } catch (err) {
      console.error(`[${panelTitle}] Error sending message:`, err);
      setError(err.message || "Failed to send message");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (file) => {
    setSelectedFile(file);
  };

 // Replace the handleSendWithAttachment function in your SingleChatPanel.jsx

const handleSendWithAttachment = async (e) => {
  if (e) e.preventDefault();
  if (!selectedFile || !conversation) return;

  try {
    setUploading(true);
    setError(null);

    const messageType = selectedFile.type.startsWith("image/")
      ? "image"
      : "file";
    const caption = messageInputRef.current?.value?.trim() || null;

    console.log(
      `[${panelTitle}] Starting attachment upload process for:`,
      {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        lastModified: new Date(selectedFile.lastModified).toISOString()
      }
    );

    console.log(`[${panelTitle}] Environment:`, {
      isCodeSandbox: window.location.hostname.includes('codesandbox.io'),
      hostname: window.location.hostname,
      protocol: window.location.protocol
    });

    // Try using the chatService.sendMessageWithAttachment function
    console.log(`[${panelTitle}] Sending message with attachment...`);
    const result = await chatService.sendMessageWithAttachment(
      conversation,
      userId,
      selectedFile,
      messageType,
      replyToMessage ? replyToMessage.message_id : null
    );

    console.log(`[${panelTitle}] Send result:`, result);

    // Clear the selected file and input
    setSelectedFile(null);
    setReplyToMessage(null);
    if (messageInputRef.current) messageInputRef.current.value = "";

    // Reload messages to show the new message with attachment
    await loadMessages(conversation);
  } catch (err) {
    console.error(`[${panelTitle}] Error sending attachment:`, err);
    setError(err.message || "Failed to send attachment");
    
    // Try to update the placeholder message to indicate failure
    if (err.messageId) {
      try {
        await chatService.editMessage(
          err.messageId,
          userId,
          "Failed to send attachment: " + (err.message || "Unknown error")
        );
      } catch (editError) {
        console.error(`[${panelTitle}] Error updating failed message:`, editError);
      }
    }
  } finally {
    setUploading(false);
  }
};

  // Handle cancellation of file upload
  const handleCancelUpload = () => {
    setSelectedFile(null);
  };

  // Update typing status
  const updateTypingStatus = async (isTyping) => {
    if (!userId || !conversation) return;

    try {
      await chatService.updateTypingStatus(conversation, userId, isTyping);
    } catch (err) {
      console.error(`[${panelTitle}] Error updating typing status:`, err);
    }
  };

  // Toggle reaction on a message
  const toggleReaction = async (messageId, reaction) => {
    if (!userId) return;

    try {
      setError(null);
      await chatService.toggleReaction(messageId, userId, reaction);
      await loadMessages(conversation);
    } catch (err) {
      console.error(`[${panelTitle}] Error toggling reaction:`, err);
      setError(err.message || "Failed to toggle reaction");
    }
  };

  // Delete a message
  const deleteMessage = async (messageId, deleteForEveryone = false) => {
    if (!userId) return;

    try {
      setError(null);
      await chatService.deleteMessage(messageId, userId, deleteForEveryone);
      await loadMessages(conversation);
    } catch (err) {
      console.error(`[${panelTitle}] Error deleting message:`, err);
      setError(err.message || "Failed to delete message");
    }
  };

  // Load attachments for a message
  const loadAttachments = async (messageId) => {
    if (messageAttachments[messageId]) return; // Already loaded

    try {
      const attachments = await chatService.getMessageAttachments(messageId);
      if (attachments && attachments.length > 0) {
        setMessageAttachments((prev) => ({
          ...prev,
          [messageId]: attachments,
        }));
      }
    } catch (err) {
      console.error(
        `[${panelTitle}] Error loading attachments for message ${messageId}:`,
        err
      );
    }
  };

  // Handle typing event
  const handleTyping = (e) => {
    const text = e.target.value;

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing indicator if there is text
    if (text.trim()) {
      updateTypingStatus(true);

      // Set timeout to stop typing indicator after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        updateTypingStatus(false);
      }, 2000);
    } else {
      updateTypingStatus(false);
    }
  };

  // Handle message submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!messageInputRef.current) return;

    const content = messageInputRef.current.value.trim();

    if (content && conversation) {
      await sendMessage(
        content,
        "text",
        replyToMessage ? replyToMessage.message_id : null
      );
      messageInputRef.current.value = "";
      setReplyToMessage(null);
      updateTypingStatus(false);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  // Clean up subscriptions and polling
  const cleanup = () => {
    console.log(`[${panelTitle}] Cleaning up component`);

    // Clean up typing indicator
    updateTypingStatus(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Unsubscribe from the shared subscription service
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // Cleanup read timeout
    if (readTimeoutRef.current) {
      clearTimeout(readTimeoutRef.current);
    }

    // Mark conversation as read when leaving
    if (conversation && userId) {
      chatService
        .markConversationAsRead(conversation, userId)
        .catch((err) =>
          console.error(
            `[${panelTitle}] Error marking conversation as read:`,
            err
          )
        );
    }
  };

  // Initialize conversation when userId and otherUserId are provided
  useEffect(() => {
    console.log(
      `[${panelTitle}] Initializing with userId=${userId}, otherUserId=${otherUserId}`
    );

    if (userId && otherUserId) {
      initializeConversation();
    }

    // Cleanup on unmount or when users change
    return cleanup;
  }, [userId, otherUserId]);

  // Load attachments for messages
  useEffect(() => {
    messages.forEach((message) => {
      if (message.message_type === "image" || message.message_type === "file") {
        loadAttachments(message.message_id);
      }
    });
  }, [messages]);

  // Set up periodic refresh as a backup
  useEffect(() => {
    if (!conversation) return;

    // Force refresh every 5 seconds as a backup
    const intervalId = setInterval(() => {
      if (conversation && !isLoadingRef.current) {
        console.log(`[${panelTitle}] Periodic refresh of messages`);
        loadMessages(conversation);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [conversation, loadMessages]);

  // Add effect to mark messages as read when they become visible
  useEffect(() => {
    // Initial check after messages load
    setTimeout(() => {
      handleMessageVisibility();
    }, 500);

    // Add scroll listener to check message visibility
    const messageContainer = document.querySelector(".messages-container");
    if (messageContainer) {
      const handleScroll = () => handleMessageVisibility();
      messageContainer.addEventListener("scroll", handleScroll);

      return () => {
        messageContainer.removeEventListener("scroll", handleScroll);
      };
    }
  }, [handleMessageVisibility, messages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chat-panel">
      <h2>{panelTitle}</h2>
      <div style={{ fontSize: "0.8em", marginBottom: "10px" }}>
        User ID: {userId}
      </div>

      {error && (
        <div
          style={{
            backgroundColor: "#f8d7da",
            color: "#721c24",
            padding: "10px",
            borderRadius: "4px",
            marginBottom: "15px",
          }}
        >
          Error: {error}
        </div>
      )}

      {conversation ? (
        <div>
          <div style={{ marginBottom: "10px", fontSize: "0.8em" }}>
            <strong>Conversation ID:</strong> {conversation}
            <button
              onClick={() => loadMessages(conversation)}
              style={{
                marginLeft: "10px",
                padding: "2px 5px",
                fontSize: "0.9em",
              }}
            >
              Refresh
            </button>
          </div>

          {/* Reply preview */}
          {replyToMessage && (
            <div
              style={{
                padding: "10px",
                backgroundColor: "#f8f9fa",
                borderRadius: "4px",
                marginBottom: "10px",
                position: "relative",
                border: "1px solid #ddd",
              }}
            >
              <div style={{ fontWeight: "bold", fontSize: "0.9em" }}>
                Replying to{" "}
                {replyToMessage.sender_id === userId
                  ? "yourself"
                  : replyToMessage.sender_name}
                :
              </div>
              <div style={{ fontSize: "0.9em" }}>{replyToMessage.content}</div>
              <button
                onClick={() => setReplyToMessage(null)}
                style={{
                  position: "absolute",
                  top: "5px",
                  right: "5px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "1.2em",
                }}
              >
                &times;
              </button>
            </div>
          )}

          {/* Messages container */}
          <div
            className="messages-container"
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              height: "300px",
              overflowY: "auto",
              marginBottom: "15px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {loading && messages.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  color: "#888",
                  marginTop: "20px",
                }}
              >
                Loading messages...
              </div>
            )}

            {!loading && messages.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  color: "#888",
                  marginTop: "20px",
                }}
              >
                No messages yet. Start the conversation!
              </div>
            )}

            {messages.map((message) => {
              const isCurrentUser = message.sender_id === userId;

              return (
                <div
                  key={message.message_id}
                  className="message-item"
                  data-message-id={message.message_id}
                  style={{
                    alignSelf: isCurrentUser ? "flex-end" : "flex-start",
                    backgroundColor: isCurrentUser ? "#dcf8c6" : "#f1f0f0",
                    padding: "8px 12px",
                    borderRadius: "16px",
                    maxWidth: "70%",
                    marginBottom: "8px",
                    position: "relative",
                  }}
                >
                  <div style={{ fontWeight: "bold", fontSize: "0.8em" }}>
                    {isCurrentUser ? "You" : message.sender_name}
                  </div>

                  {message.is_deleted ? (
                    <div style={{ fontStyle: "italic", color: "#888" }}>
                      This message was deleted
                    </div>
                  ) : (
                    <div>{message.content}</div>
                  )}

                  {/* Display attachments */}
                  {message.message_type === "image" ||
                  message.message_type === "file" ? (
                    messageAttachments[message.message_id] &&
                    messageAttachments[message.message_id].length > 0 ? (
                      <div style={{ marginTop: "5px" }}>
                        {messageAttachments[message.message_id].map(
                          (attachment) => (
                            <MessageAttachment
                              key={attachment.id}
                              attachment={attachment}
                            />
                          )
                        )}
                      </div>
                    ) : message.content ===
                      `Sending ${message.message_type}...` ? (
                      <div
                        style={{
                          fontSize: "0.8em",
                          color: "#666",
                          fontStyle: "italic",
                          marginTop: "5px",
                        }}
                      >
                        Uploading... Please wait.
                      </div>
                    ) : null
                  ) : null}

                  {/* Display reply info if this is a reply */}
                  {message.reply_to_id && !message.is_deleted && (
                    <div
                      style={{
                        fontSize: "0.8em",
                        color: "#666",
                        backgroundColor: "rgba(0,0,0,0.05)",
                        padding: "4px 8px",
                        borderRadius: "8px",
                        marginTop: "4px",
                        marginBottom: "4px",
                      }}
                    >
                      <div style={{ fontWeight: "bold" }}>
                        Reply to {message.reply_to_sender}
                      </div>
                      <div>{message.reply_to_content}</div>
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: "0.7em",
                      color: "#888",
                      textAlign: "right",
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                    }}
                  >
                    {new Date(message.created_at).toLocaleTimeString()}
                    {message.edited_at && " (edited)"}

                    {/* Add the message status component for read receipts */}
                    <MessageStatus
                      message={message}
                      currentUserId={userId}
                      showDetails={true}
                    />
                  </div>

                  {!message.is_deleted && (
                    <div
                      style={{ marginTop: "5px", display: "flex", gap: "5px" }}
                    >
                      <button
                        onClick={() => toggleReaction(message.message_id, "👍")}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                      >
                        👍
                      </button>
                      <button
                        onClick={() => toggleReaction(message.message_id, "❤️")}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                      >
                        ❤️
                      </button>
                      <button
                        onClick={() => setReplyToMessage(message)}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                      >
                        ↩️
                      </button>
                      {isCurrentUser && (
                        <button
                          onClick={() =>
                            deleteMessage(message.message_id, true)
                          }
                          style={{
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  )}

                  {/* Display reactions */}
                  {message.reactions && message.reactions.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "-10px",
                        background: "white",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        border: "1px solid #ddd",
                        fontSize: "0.8em",
                      }}
                    >
                      {Array.isArray(message.reactions)
                        ? message.reactions.map((reaction, index) => (
                            <span key={index}>{reaction.reaction}</span>
                          ))
                        : null}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing indicators */}
            {Object.keys(typingUsers).length > 0 &&
              Object.keys(typingUsers).some((id) => id !== userId) && (
                <div
                  style={{
                    fontStyle: "italic",
                    color: "#888",
                    marginTop: "8px",
                  }}
                >
                  Someone is typing...
                </div>
              )}

            <div ref={messagesEndRef} />
          </div>

          {/* File preview */}
          {selectedFile && (
            <FilePreview file={selectedFile} onCancel={handleCancelUpload} />
          )}

          {/* Message input form */}
          <form
            onSubmit={selectedFile ? handleSendWithAttachment : handleSubmit}
            style={{ display: "flex", gap: "10px", alignItems: "center" }}
          >
            <FileUploadButton
              onFileSelect={handleFileSelect}
              disabled={uploading || !conversation || !!selectedFile}
              acceptedTypes="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/zip"
            />

            <input
              type="text"
              ref={messageInputRef}
              placeholder={
                selectedFile
                  ? "Add a caption (optional)"
                  : "Type your message..."
              }
              onChange={handleTyping}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
              disabled={uploading}
            />

            <button
              type="submit"
              disabled={
                uploading ||
                (!selectedFile &&
                  (!messageInputRef.current ||
                    !messageInputRef.current.value.trim()))
              }
              style={{
                padding: "8px 16px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                opacity: uploading ? 0.7 : 1,
              }}
            >
              {uploading ? "Sending..." : selectedFile ? "Send File" : "Send"}
            </button>
          </form>
        </div>
      ) : (
        <div>Initializing conversation...</div>
      )}
    </div>
  );
};
