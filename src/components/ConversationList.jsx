// src/components/ConversationList.jsx
import React from "react";
import { useChat } from "../context/ChatContext";

export const ConversationList = () => {
  const {
    conversations,
    currentConversation,
    setCurrentConversation,
    loading,
  } = useChat();

  if (loading) return <div>Loading conversations...</div>;

  if (conversations.length === 0) return <div>No conversations found.</div>;

  return (
    <div
      style={{
        border: "1px solid #ccc",
        padding: "10px",
        marginBottom: "15px",
      }}
    >
      <h3>Your Conversations</h3>
      <ul style={{ listStyleType: "none", padding: 0 }}>
        {conversations.map((convo) => (
          <li
            key={convo.conversation_id}
            style={{
              padding: "8px",
              cursor: "pointer",
              backgroundColor:
                currentConversation === convo.conversation_id
                  ? "#e0e0e0"
                  : "transparent",
              marginBottom: "5px",
              borderRadius: "4px",
            }}
            onClick={() => setCurrentConversation(convo.conversation_id)}
          >
            <div style={{ fontWeight: "bold" }}>
              {convo.conversation_title ||
                "Chat with " + convo.other_participant_name}
            </div>
            <div style={{ fontSize: "0.8em", color: "#666" }}>
              {convo.last_message_content ? (
                <span>Last message: {convo.last_message_content}</span>
              ) : (
                <span>No messages yet</span>
              )}
            </div>
            <div style={{ fontSize: "0.7em", color: "#888" }}>
              {convo.last_message_time
                ? new Date(convo.last_message_time).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </div>
            {convo.unread_count > 0 && (
              <span
                style={{
                  backgroundColor: "#007bff",
                  color: "white",
                  borderRadius: "50%",
                  padding: "2px 6px",
                  fontSize: "0.7em",
                  marginLeft: "5px",
                }}
              >
                {convo.unread_count}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
