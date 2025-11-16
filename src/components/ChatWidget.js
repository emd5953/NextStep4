// src/components/ChatWidget.js

import React, { useState, useEffect, useRef } from "react";
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from "react-markdown";
import "../styles/ChatWidget.css";

// Initialize the AI client with your API key.
// IMPORTANT: For production, secure your API key in environment variables.
const ai = new GoogleGenAI({ apiKey: "" });

const ChatWidget = () => {
  const [isMinimized, setIsMinimized] = useState(true); // Start minimized
  const [showPrompt, setShowPrompt] = useState(false); // Show "Ask me" prompt
  const [messages, setMessages] = useState([]); // Chat history
  const [input, setInput] = useState(""); // User input
  const [loading, setLoading] = useState(false);
  
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

  // Handle sending a message
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user's message to chat history
    const userMessage = { text: input, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Prepend context instructions so the AI only answers about NextStep.
    const context =
      "You are an AI assistant for NextStep Help Chat, a job matching platform. Only answer questions about NextStep (job matching, swipe-based job discovery, application tracking, employer dashboard, etc.). Do not answer questions about coding, recipes, or other unrelated topics.";
    const fullPrompt = `${context}\n\nUser: ${input}`;

    try {
      // Send the full prompt to Gemini and await a response
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: fullPrompt,
      });
      console.log("AI response:", response);

      // Extract text from the candidate response
      const candidate = response.candidates && response.candidates[0];
      let botText = "No response";
      if (candidate && candidate.content) {
        if (Array.isArray(candidate.content.parts)) {
          botText = candidate.content.parts.map((part) => part.text).join(" ");
        } else if (typeof candidate.content === "string") {
          botText = candidate.content;
        } else if (candidate.content.text) {
          botText = candidate.content.text;
        }
      } else if (response.text) {
        botText = response.text;
      }

      const botMessage = { text: botText, sender: "bot" };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error fetching AI response", error);
      const errorMessage = { text: "Error: Unable to fetch response", sender: "bot" };
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