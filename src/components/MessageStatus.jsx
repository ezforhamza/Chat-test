// src/components/MessageStatus.jsx
import React, { useState } from "react";

// Component to display message status with blue ticks
const MessageStatus = ({
  message,
  currentUserId,
  showDetails = false,
  detailsPosition = "top",
}) => {
  const [showReadReceipts, setShowReadReceipts] = useState(false);

  // If we don't have the required data or it's not the sender viewing the message, don't show
  if (!message || message.sender_id !== currentUserId) {
    return null;
  }

  const { read_by_count, is_read } = message;

  // Determine message status
  const getMessageStatus = () => {
    if (message.is_deleted) {
      return "deleted";
    }

    if (read_by_count > 0) {
      return "read";
    }

    return "sent";
  };

  const status = getMessageStatus();

  // Format timestamp for display
  const formatTime = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Render appropriate icon based on status
  const renderStatusIcon = () => {
    switch (status) {
      case "read":
        return (
          <span
            title={`Read by ${read_by_count} ${
              read_by_count === 1 ? "person" : "people"
            }`}
            onClick={() =>
              showDetails && setShowReadReceipts(!showReadReceipts)
            }
            style={{
              color: "#4D96FF",
              cursor: showDetails ? "pointer" : "default",
              fontSize: "0.8em",
              marginLeft: "4px",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L9.7 16.4l-4.2-3.5" />
              <path d="M18 14L9.7 24.4l-4.2-3.5" />
            </svg>
            {read_by_count > 1 && (
              <span style={{ marginLeft: "2px", fontSize: "0.85em" }}>
                {read_by_count}
              </span>
            )}
          </span>
        );
      case "sent":
        return (
          <span
            title="Sent"
            style={{ color: "#6c757d", fontSize: "0.8em", marginLeft: "4px" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L9.7 16.4l-4.2-3.5" />
            </svg>
          </span>
        );
      case "deleted":
        return null;
      default:
        return null;
    }
  };

  // Render read receipts popover if enabled
  const renderReadReceipts = () => {
    if (
      !showReadReceipts ||
      !showDetails ||
      !message.readReceipts ||
      message.readReceipts.length === 0
    ) {
      return null;
    }

    return (
      <div
        style={{
          position: "absolute",
          [detailsPosition === "top" ? "bottom" : "top"]: "100%",
          right: 0,
          backgroundColor: "white",
          border: "1px solid #ddd",
          borderRadius: "4px",
          padding: "8px",
          minWidth: "150px",
          boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          zIndex: 100,
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "5px" }}>Read by:</div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {message.readReceipts.map((receipt) => (
            <li
              key={receipt.userId}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "3px",
              }}
            >
              {receipt.avatarUrl ? (
                <img
                  src={receipt.avatarUrl}
                  alt={receipt.userName}
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    marginRight: "8px",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: "#e0e0e0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: "8px",
                    fontSize: "10px",
                  }}
                >
                  {receipt.userName.charAt(0)}
                </div>
              )}
              <div style={{ fontSize: "0.8em" }}>
                <div>{receipt.userName}</div>
                <div style={{ fontSize: "0.8em", color: "#6c757d" }}>
                  {formatTime(receipt.readAt)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {renderStatusIcon()}
      {renderReadReceipts()}
    </div>
  );
};

export default MessageStatus;
