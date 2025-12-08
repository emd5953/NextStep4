// src/components/ChatWidget.js

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import "../styles/ChatWidget.css";

// REMOVE THIS - No more direct API initialization
// const ai = new GoogleGenAI({ apiKey: "" });

const ChatWidget = () => {
  const [isMinimized, setIsMinimized] = useState(true); // Start minimized
  const [showPrompt, setShowPrompt] = useState(false); // Show "Ask me" prompt
  const [messages, setMessages] = useState([]); // Chat history
  const [input, setInput] = useState(""); // User input
  const [loading, setLoading] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState({}); // Track feedback per message
  
  // Reference for auto-scrolling
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages]);

  // Show prompt after 3 seconds on page load, hide after 10 seconds
  useEffect(() => {
    const showTimer = setTimeout(() => {
      setShowPrompt(true);
    }, 3000);

    const hideTimer = setTimeout(() => {
      setShowPrompt(false);
    }, 13000); // 3s + 10s = 13s total

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  // When the chatbox is opened and there are no messages, show a welcome message.
  useEffect(() => {
    if (!isMinimized && messages.length === 0) {
      setMessages([
        {
          text:
            "Welcome to **NextStep Help Chat!**\n\nAsk me anything about NextStep.",
          sender: "bot",
        },
      ]);
    }
  }, [isMinimized, messages]);

  // Toggle minimize state when header is clicked
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    setShowPrompt(false); // Hide prompt when clicked
  };

  const handleFeedback = async (messageId, feedbackType, query) => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
      await fetch(`${API_URL}/api/rag-chat/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: messageId.toString(),
          feedback: feedbackType,
          query: query
        }),
      });

      // Mark feedback as given for this message
      setFeedbackGiven(prev => ({ ...prev, [messageId]: feedbackType }));
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user's message to chat history
    const userMessage = { text: input, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input; // Save input before clearing
    setInput("");
    setLoading(true);

    try {
      // Call your backend API instead of Gemini directly
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_URL}/api/rag-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: currentInput }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const botMessage = { 
        id: Date.now() + Math.random(), // Unique ID for feedback
        text: data.response, 
        sender: "bot",
        sources: data.sources || [], // Include sources from RAG response
        query: currentInput // Store original query for feedback
      };
      setMessages((prev) => [...prev, botMessage]);

    } catch (error) {
      console.error("Error fetching AI response:", error);
      const errorMessage = { 
        text: "Sorry, I'm having trouble connecting. Please try again later.", 
        sender: "bot" 
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Chat Prompt Notification */}
      {showPrompt && isMinimized && (
        <div className="chat-prompt" onClick={toggleMinimize}>
          <span>Have questions? Ask me!</span>
        </div>
      )}

      {/* Chat Widget */}
      <div className={`${isMinimized ? 'chat-widget-hide' : 'chat-widget'}`} onClick={isMinimized ? toggleMinimize : undefined}>
        {isMinimized ? (
          <div className="chat-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
        ) : (
          <>
            <div className="chat-widget-header" onClick={toggleMinimize}>
              <span className="chat-title">Chat</span>
              <span className="close-icon">✕</span>
            </div>
            <div className="chat-widget-body">
              <div className="chat-widget-messages" ref={messagesEndRef}>
                {messages.map((msg, index) => (
                  <div key={index} className={`message ${msg.sender}`}>
                    {msg.sender === "bot" ? (
                      <div className="bot-message">
                        <img
                          src="https://i.pravatar.cc/40?img=3"
                          alt="NextStep Bot"
                          className="bot-avatar"
                        />
                        <div className="bot-content">
                          <div className="bot-name">NextStep Bot</div>
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                          {msg.id && (
                            <div className="feedback-buttons">
                              {!feedbackGiven[msg.id] ? (
                                <>
                                  <button 
                                    className="feedback-btn feedback-positive"
                                    onClick={() => handleFeedback(msg.id, 'positive', msg.query)}
                                    title="This was helpful"
                                  >
                                    👍 Helpful
                                  </button>
                                  <button 
                                    className="feedback-btn feedback-negative"
                                    onClick={() => handleFeedback(msg.id, 'negative', msg.query)}
                                    title="This wasn't helpful"
                                  >
                                    👎 Not helpful
                                  </button>
                                </>
                              ) : (
                                <span className="feedback-thanks">
                                  Thanks for your feedback! {feedbackGiven[msg.id] === 'positive' ? '👍' : '👎'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="message bot">
                    <div className="bot-message">
                      <img
                        src="https://i.pravatar.cc/40?img=3"
                        alt="NextStep Bot"
                        className="bot-avatar"
                      />
                      <div className="bot-content">
                        <div className="bot-name">NextStep Bot</div>
                        Typing...
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <form onSubmit={handleSubmit} className="chat-widget-form">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                />
                <button type="submit">Send</button>
              </form>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default ChatWidget;