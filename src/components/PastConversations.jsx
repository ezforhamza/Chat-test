// src/components/PastConversations.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";

const PastConversations = ({ userId, onSelectConversation }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchConversations() {
      if (!userId) return;
      
      try {
        setLoading(true);
        
        // Get all conversations where the user is a participant
        const { data, error } = await supabase.rpc(
          "get_user_conversations",
          { p_user_id: userId }
        );

        if (error) throw error;
        
        setConversations(data || []);
      } catch (err) {
        console.error("Error fetching conversations:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchConversations();
  }, [userId]);

  if (loading) return <div className="past-conversations-loading">Loading conversations...</div>;
  
  if (error) return <div className="past-conversations-error">Error: {error}</div>;
  
  if (conversations.length === 0) {
    return <div className="past-conversations-empty">No conversations found</div>;
  }

  return (
    <div className="past-conversations">
      <h2>Past Conversations</h2>
      <div className="conversation-list">
        {conversations.map((conversation) => (
          <div 
            key={conversation.conversation_id} 
            className="conversation-card"
            onClick={() => onSelectConversation(conversation)}
          >
            <div className="conversation-header">
              <span className="conversation-title">
                {conversation.conversation_title || 
                 `Chat with ${conversation.other_participant_name}`}
              </span>
              {conversation.unread_count > 0 && (
                <span className="unread-badge">{conversation.unread_count}</span>
              )}
            </div>
            <div className="conversation-preview">
              {conversation.last_message_content ? (
                <p>{conversation.last_message_content}</p>
              ) : (
                <p className="no-messages">No messages yet</p>
              )}
            </div>
            <div className="conversation-time">
              {conversation.last_message_time && 
                new Date(conversation.last_message_time).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PastConversations;