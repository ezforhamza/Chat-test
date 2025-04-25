// src/components/DualChatTester.jsx
import React, { useState } from "react";
import { SingleChatPanel } from "./SingleChatPanel";
import { chatService } from "../services/chatService";

export const DualChatTester = () => {
  // Default IDs
  const [userId1, setUserId1] = useState(
    "df24e3b0-b5fc-4b6c-9962-68661d957b81"
  );
  const [userId2, setUserId2] = useState(
    "cfd3ac1b-1b7f-4798-958c-fff5c4387d5a"
  );
  const [systemTestResult, setSystemTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

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
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      <h1>SkillRise Dual Chat Tester</h1>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginBottom: "20px",
          padding: "15px",
          border: "1px solid #ddd",
          borderRadius: "4px",
          backgroundColor: "#f8f9fa",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Setup</h2>

        <div style={{ display: "flex", gap: "20px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: "5px" }}>
              User 1 ID:
            </label>
            <input
              type="text"
              value={userId1}
              onChange={(e) => setUserId1(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: "5px" }}>
              User 2 ID:
            </label>
            <input
              type="text"
              value={userId2}
              onChange={(e) => setUserId2(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            />
          </div>
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
            alignSelf: "flex-start",
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
            <h4 style={{ marginTop: 0 }}>System Test Results:</h4>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontSize: "0.8rem",
                maxHeight: "150px",
                overflowY: "auto",
                backgroundColor: "#f8f9fa",
                padding: "8px",
                borderRadius: "4px",
              }}
            >
              {JSON.stringify(systemTestResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "20px" }}>
        <div
          style={{
            flex: 1,
            border: "1px solid #ddd",
            borderRadius: "4px",
            padding: "15px",
          }}
        >
          <SingleChatPanel
            userId={userId1}
            otherUserId={userId2}
            panelTitle="User 1 Chat"
          />
        </div>

        <div
          style={{
            flex: 1,
            border: "1px solid #ddd",
            borderRadius: "4px",
            padding: "15px",
          }}
        >
          <SingleChatPanel
            userId={userId2}
            otherUserId={userId1}
            panelTitle="User 2 Chat"
          />
        </div>
      </div>
    </div>
  );
};
