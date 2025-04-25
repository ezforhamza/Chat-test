// src/App.js
import React, { useState } from "react";
import { ChatProvider } from "./context/ChatContext";
import { ChatTester } from "./components/ChatTester";
import { DualChatTester } from "./components/DualChatTester";
import ConversationViewer from "./components/ConversationViewer";
import "./styles/conversations.css";

function App() {
  const [activeComponent, setActiveComponent] = useState("conversations"); // Default to conversations view

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
            onClick={() => setActiveComponent("conversations")}
            style={{
              padding: "8px 16px",
              backgroundColor: activeComponent === "conversations" ? "#28a745" : "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: activeComponent === "conversations" ? "bold" : "normal",
            }}
          >
            Past Conversations
          </button>
          <button
            onClick={() => setActiveComponent("single")}
            style={{
              padding: "8px 16px",
              backgroundColor: activeComponent === "single" ? "#28a745" : "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: activeComponent === "single" ? "bold" : "normal",
            }}
          >
            Single Chat Tester
          </button>
          <button
            onClick={() => setActiveComponent("dual")}
            style={{
              padding: "8px 16px",
              backgroundColor: activeComponent === "dual" ? "#28a745" : "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: activeComponent === "dual" ? "bold" : "normal",
            }}
          >
            Dual Chat Tester
          </button>
        </div>
      </div>

      <ChatProvider>
        {activeComponent === "conversations" && <ConversationViewer />}
        {activeComponent === "single" && <ChatTester />}
        {activeComponent === "dual" && <DualChatTester />}
      </ChatProvider>
    </div>
  );
}

export default App;