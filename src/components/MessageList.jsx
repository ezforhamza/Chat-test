// src/components/MessageList.jsx
import React, { useEffect, useRef } from "react";
import { useChat } from "../context/ChatContext";

export const MessageList = () => {
  const {
    messages,
    currentUserId,
    typingUsers,
    loading,
    toggleReaction,
    deleteMessage,
  } = useChat();
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) return <div>Loading messages...</div>;

  if (messages.length === 0)
    return <div>No messages yet. Start the conversation!</div>;

  // Filter out the current user from typing indicators
  const typingUserIds = Object.keys(typingUsers).filter(
    (id) => id !== currentUserId
  );

  return (
    <div
      style={{
        border: "1px solid #ccc",
        padding: "10px",
        height: "400px",
        overflowY: "auto",
        marginBottom: "15px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {messages.map((message) => {
        const isCurrentUser = message.sender_id === currentUserId;

        return (
          <div
            key={message.message_id}
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

            {/* Display reply info if this is a reply */}
            {message.reply_to_id && !message.is_deleted && (
              <div
                style={{
                  fontSize: "0.8em",
                  color: "#666",
                  backgroundColor: "rgba(0,0,0,0.05)",
                  padding: "4px 8px",
                  borderRadius: "8px",
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
              style={{ fontSize: "0.7em", color: "#888", textAlign: "right" }}
            >
              {new Date(message.created_at).toLocaleTimeString()}
              {message.edited_at && " (edited)"}
            </div>

            {!message.is_deleted && (
              <div style={{ marginTop: "5px", display: "flex", gap: "5px" }}>
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
                {isCurrentUser && (
                  <button
                    onClick={() => deleteMessage(message.message_id, true)}
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
      {typingUserIds.length > 0 && (
        <div style={{ fontStyle: "italic", color: "#888", marginTop: "8px" }}>
          {typingUserIds.length === 1
            ? "Someone is typing..."
            : "Several people are typing..."}
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
