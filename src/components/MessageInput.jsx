// src/components/MessageInput.jsx
import React, { useState, useEffect, useRef } from "react";
import { useChat } from "../context/ChatContext";

export const MessageInput = () => {
  const { sendMessage, updateTypingStatus, currentConversation } = useChat();
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Handle typing status
  useEffect(() => {
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (!message) {
      if (isTyping) {
        setIsTyping(false);
        updateTypingStatus(false);
      }
      return;
    }

    if (!isTyping) {
      setIsTyping(true);
      updateTypingStatus(true);
    }

    // Set new timeout to stop typing indicator after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingStatus(false);
    }, 2000);

    // Clean up on unmount or when dependencies change
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, isTyping, updateTypingStatus]);

  // Cleanup typing status when component unmounts
  useEffect(() => {
    return () => {
      if (isTyping) {
        updateTypingStatus(false);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [updateTypingStatus, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || !currentConversation) return;

    try {
      await sendMessage(message);
      setMessage("");

      // Ensure typing indicator is turned off immediately after sending
      if (isTyping) {
        setIsTyping(false);
        updateTypingStatus(false);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <form onSubmit={handleSend} style={{ display: "flex", gap: "10px" }}>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        style={{
          flex: 1,
          padding: "8px",
          borderRadius: "4px",
          border: "1px solid #ccc",
        }}
        disabled={!currentConversation}
      />
      <button
        type="submit"
        disabled={!message.trim() || !currentConversation}
        style={{
          padding: "8px 16px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor:
            message.trim() && currentConversation ? "pointer" : "not-allowed",
        }}
      >
        Send
      </button>
    </form>
  );
};
