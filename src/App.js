// src/App.js
import React, { useState } from "react";
import { ChatProvider } from "./context/ChatContext";
import { ChatTester } from "./components/ChatTester";
import { DualChatTester } from "./components/DualChatTester";

function App() {
  const [showDualChat, setShowDualChat] = useState(true); // Set to true by default to show dual chat

  return (
    <div className="App">
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "10px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "10px",
            gap: "10px",
          }}
        >
          <button
            onClick={() => setShowDualChat(false)}
            style={{
              padding: "8px 16px",
              backgroundColor: !showDualChat ? "#28a745" : "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: !showDualChat ? "bold" : "normal",
            }}
          >
            Single Chat Tester
          </button>
          <button
            onClick={() => setShowDualChat(true)}
            style={{
              padding: "8px 16px",
              backgroundColor: showDualChat ? "#28a745" : "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: showDualChat ? "bold" : "normal",
            }}
          >
            Dual Chat Tester
          </button>
        </div>
      </div>

      <ChatProvider>
        {showDualChat ? <DualChatTester /> : <ChatTester />}
      </ChatProvider>
    </div>
  );
}

export default App;
