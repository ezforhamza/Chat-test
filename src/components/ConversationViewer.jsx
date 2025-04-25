// src/components/ConversationViewer.jsx
import React, { useState } from "react";
import { SingleChatPanel } from "./SingleChatPanel";
import PastConversations from "./PastConversations";

const ConversationViewer = () => {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [currentUserId, setCurrentUserId] = useState("");
  
  // Handle user ID input
  const handleUserIdChange = (e) => {
    setCurrentUserId(e.target.value);
  };

  // Handle conversation selection
  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
  };

  return (
    <div className="conversation-viewer">
      <div className="user-input-section">
        <h2>Enter Your User ID</h2>
        <div className="user-id-input">
          <input
            type="text"
            value={currentUserId}
            onChange={handleUserIdChange}
            placeholder="Enter your user ID"
            style={{
              padding: "8px",
              marginRight: "10px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              width: "300px"
            }}
          />
        </div>
      </div>

      {currentUserId && (
        <div className="conversations-container">
          <div className="past-conversations-section">
            <PastConversations 
              userId={currentUserId}
              onSelectConversation={handleSelectConversation}
            />
          </div>

          {selectedConversation && (
            <div className="chat-panels-section">
              <h2>Conversation View</h2>
              <div className="dual-chat-container" style={{ display: "flex", gap: "20px" }}>
                <div className="chat-panel-container" style={{ flex: 1 }}>
                  <SingleChatPanel
                    userId={currentUserId}
                    otherUserId={selectedConversation.other_participant_id}
                    panelTitle="Your View"
                  />
                </div>
                <div className="chat-panel-container" style={{ flex: 1 }}>
                  <SingleChatPanel
                    userId={selectedConversation.other_participant_id}
                    otherUserId={currentUserId}
                    panelTitle="Other User's View"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConversationViewer;