// src/components/ChatTester.jsx
import React, { useState } from "react";
import { useChat } from "../context/ChatContext";
import { ConversationList } from "./ConversationList";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { chatService } from "../services/chatService"; // Import the chatService

export const ChatTester = () => {
  const {
    currentUserId,
    otherUserId,
    setUser,
    setOtherUser,
    createOrGetConversation,
    loadMessages,
    currentConversation,
    error,
  } = useChat();

  // Default IDs
  const [userId1Input, setUserId1Input] = useState(
    "df24e3b0-b5fc-4b6c-9962-68661d957b81"
  );
  const [userId2Input, setUserId2Input] = useState(
    "cfd3ac1b-1b7f-4798-958c-fff5c4387d5a"
  );
  const [systemTestResult, setSystemTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const handleSetCurrentUser = () => {
    setUser(userId1Input);
  };

  const handleSetOtherUser = () => {
    setOtherUser(userId2Input);
  };

  const handleCreateConversation = async () => {
    await createOrGetConversation();
  };

  const handleRefreshMessages = async () => {
    if (currentConversation) {
      await loadMessages(currentConversation);
    }
  };

  const handleTestSystem = async () => {
    try {
      setTestLoading(true);
      const result = await chatService.testChatSystem();
      console.log("System test result:", result);
      setSystemTestResult(result);
      alert("Chat system test successful! Check console for details.");
    } catch (err) {
      console.error("System test failed:", err);
      setSystemTestResult({ error: err.message });
      alert(`Chat system test failed: ${err.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <h1>SkillRise Chat Tester</h1>

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

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginBottom: "20px",
          padding: "15px",
          border: "1px solid #ddd",
          borderRadius: "4px",
        }}
      >
        <h2>Setup</h2>

        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Current User ID:
          </label>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              value={userId1Input}
              onChange={(e) => setUserId1Input(e.target.value)}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            />
            <button
              onClick={handleSetCurrentUser}
              style={{
                padding: "8px 16px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Set Current User
            </button>
          </div>
          {currentUserId && (
            <div style={{ marginTop: "5px" }}>Active User: {currentUserId}</div>
          )}
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Other User ID:
          </label>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              value={userId2Input}
              onChange={(e) => setUserId2Input(e.target.value)}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            />
            <button
              onClick={handleSetOtherUser}
              style={{
                padding: "8px 16px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Set Other User
            </button>
          </div>
          {otherUserId && (
            <div style={{ marginTop: "5px" }}>Other User: {otherUserId}</div>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button
            onClick={handleCreateConversation}
            disabled={!currentUserId || !otherUserId}
            style={{
              padding: "8px 16px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: currentUserId && otherUserId ? "pointer" : "not-allowed",
              flex: 1,
            }}
          >
            Create/Get Conversation
          </button>

          <button
            onClick={handleRefreshMessages}
            disabled={!currentConversation}
            style={{
              padding: "8px 16px",
              backgroundColor: "#17a2b8",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: currentConversation ? "pointer" : "not-allowed",
              flex: 1,
            }}
          >
            Refresh Messages
          </button>
        </div>

        {/* Test System Button */}
        <button
          onClick={handleTestSystem}
          disabled={testLoading}
          style={{
            padding: "8px 16px",
            backgroundColor: "#6610f2",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: testLoading ? "not-allowed" : "pointer",
            marginTop: "10px",
          }}
        >
          {testLoading ? "Testing..." : "Test Chat System"}
        </button>

        {/* Display test results if available */}
        {systemTestResult && (
          <div
            style={{
              marginTop: "10px",
              padding: "10px",
              backgroundColor: systemTestResult.error ? "#f8d7da" : "#d4edda",
              borderRadius: "4px",
            }}
          >
            <h4>System Test Results:</h4>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontSize: "0.8rem",
                maxHeight: "150px",
                overflowY: "auto",
              }}
            >
              {JSON.stringify(systemTestResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {currentUserId && (
        <div style={{ marginBottom: "20px" }}>
          <ConversationList />
        </div>
      )}

      {currentConversation && (
        <div>
          <h2>Messages</h2>
          <div style={{ marginBottom: "15px" }}>
            <strong>Conversation ID:</strong> {currentConversation}
          </div>
          <MessageList />
          <MessageInput />
        </div>
      )}
    </div>
  );
};
