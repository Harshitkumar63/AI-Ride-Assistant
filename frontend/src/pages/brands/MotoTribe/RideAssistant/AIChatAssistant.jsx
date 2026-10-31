import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Sparkles,
  RotateCcw,
  MapPin,
  Compass,
  Fuel,
  CloudSun,
  ShieldAlert,
  Wrench,
  Bot,
  User,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import aiAssistantService from "../../../../services/aiAssistantService";
import "./AIChatAssistant.css";

const INITIAL_MESSAGE = {
  id: "welcome-1",
  role: "assistant",
  content: `**Namaste rider! 🏍️ I'm your MotoTribe AI Ride Assistant.**

I'm connected to your MotoTribe ecosystem with real-time intelligence for:
- 🌦️ **Live Weather & Road Conditions** for your route
- ⛽ **Current State Fuel Prices & Trip Cost Estimations**
- 🏍️ **Bike Pre-Ride Checks & Maintenance Diagnostics**
- 🛡️ **Ghat, Highway & High-Altitude Safety Protocols**
- 🗺️ **Upcoming Ride Preparation & Gear Recommendations**

How can I assist your ride today?`,
  toolsUsed: [],
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

const SUGGESTIONS = [
  {
    icon: <Fuel size={14} />,
    label: "Fuel Cost to Goa",
    prompt: "Estimate fuel cost for a 600 km trip from Mumbai to Goa using petrol at current Maharashtra rates.",
  },
  {
    icon: <CloudSun size={14} />,
    label: "Check Riding Weather",
    prompt: "What is the riding weather forecast for Bangalore and surrounding highways today?",
  },
  {
    icon: <ShieldAlert size={14} />,
    label: "Ghat Safety Advice",
    prompt: "Give me critical safety checks and riding techniques for steep monsoon ghat sections.",
  },
  {
    icon: <Wrench size={14} />,
    label: "Pre-Ride Inspection",
    prompt: "Give me a thorough 5-minute pre-ride inspection checklist for tyre, chain, and fluids.",
  },
  {
    icon: <Compass size={14} />,
    label: "My Upcoming Rides",
    prompt: "Do I have any upcoming planned rides in my MotoTribe schedule?",
  },
];

export default function AIChatAssistant({ initialTopic = null }) {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [includeLocation, setIncludeLocation] = useState(true);
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Request location on mount if user allows
  useEffect(() => {
    if (navigator.geolocation && includeLocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setLocating(false);
        },
        () => {
          setLocating(false);
        },
        { timeout: 8000 }
      );
    }
  }, [includeLocation]);

  // Pre-fill initial topic if passed from parent
  useEffect(() => {
    if (initialTopic) {
      setInputValue(`Can you give me detailed advice and tips on: "${initialTopic}"?`);
      inputRef.current?.focus();
    }
  }, [initialTopic]);

  const handleSend = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue("");
    setErrorMessage(null);
    setIsLoading(true);

    try {
      // Build history for backend (role: user | assistant)
      const history = newMessages
        .filter((m) => m.id !== "welcome-1")
        .slice(-10)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      // Include location context if available
      const context = {};
      if (includeLocation && coords) {
        context.latitude = coords.latitude;
        context.longitude = coords.longitude;
      }

      const response = await aiAssistantService.sendMessage(text, history, context);

      const assistantReply = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: response.reply,
        toolsUsed: response.toolsUsed || [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantReply]);
    } catch (err) {
      console.error("[AIChatAssistant Error]", err);
      setErrorMessage(
        err.message || "Failed to reach AI Ride Assistant. Please check server connection."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleResetChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setErrorMessage(null);
    setInputValue("");
  };

  // Helper to render formatted markdown-like text
  const renderMessageContent = (content) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      // Process bold markers (**text**)
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const renderedLine = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pIdx} className="mt-ai-bold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      // Bullet line
      if (line.trim().startsWith("- ") || line.trim().startsWith("• ")) {
        return (
          <div key={idx} className="mt-ai-bullet-item">
            <span className="mt-ai-bullet-dot">▸</span>
            <span>{renderedLine}</span>
          </div>
        );
      }

      // Empty line -> break
      if (!line.trim()) {
        return <div key={idx} className="mt-ai-spacer" />;
      }

      return (
        <p key={idx} className="mt-ai-paragraph">
          {renderedLine}
        </p>
      );
    });
  };

  return (
    <div className="mt-ai-chat-root">
      {/* Copilot Subheader / Intelligence Banner */}
      <div className="mt-ai-topbar">
        <div className="mt-ai-status-indicator">
          <span className="mt-ai-pulse-dot" />
          <div className="mt-ai-title-group">
            <span className="mt-ai-brand-badge">
              <Sparkles size={11} className="mt-ai-sparkle-icon" /> MOTOTRIBE INTELLIGENCE
            </span>
            <h3 className="mt-ai-main-title">AI Ride Co-Pilot</h3>
          </div>
        </div>

        <div className="mt-ai-controls">
          <button
            type="button"
            className={`mt-ai-location-toggle ${includeLocation ? "active" : ""}`}
            onClick={() => setIncludeLocation(!includeLocation)}
            title={coords ? `Using GPS: ${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}` : "Toggle GPS location context"}
          >
            <MapPin size={13} />
            <span>{locating ? "GPS..." : includeLocation && coords ? "GPS Active" : "Location Off"}</span>
          </button>

          <button
            type="button"
            className="mt-ai-reset-btn"
            onClick={handleResetChat}
            title="Clear chat and restart"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Suggestion Pills */}
      <div className="mt-ai-suggestions-row">
        <span className="mt-ai-suggestions-label">QUICK PROMPTS:</span>
        <div className="mt-ai-suggestions-scroll">
          {SUGGESTIONS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              className="mt-ai-pill"
              onClick={() => handleSend(item.prompt)}
              disabled={isLoading}
            >
              <span className="mt-ai-pill-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Feed */}
      <div className="mt-ai-messages-feed" role="log" aria-live="polite">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`mt-ai-message-row ${isUser ? "user" : "assistant"}`}
            >
              <div className="mt-ai-avatar">
                {isUser ? <User size={15} /> : <Bot size={16} />}
              </div>

              <div className="mt-ai-bubble-container">
                <div className="mt-ai-bubble-meta">
                  <span className="mt-ai-sender-name">
                    {isUser ? "You" : "MotoTribe AI"}
                  </span>
                  <span className="mt-ai-time">{msg.timestamp}</span>
                </div>

                <div className="mt-ai-bubble-body">
                  {renderMessageContent(msg.content)}
                </div>

                {/* Show tools badge if tools were executed */}
                {!isUser && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                  <div className="mt-ai-tools-badge">
                    <Sparkles size={11} />
                    <span>Real-time data: {msg.toolsUsed.join(", ")}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="mt-ai-message-row assistant loading">
            <div className="mt-ai-avatar">
              <Bot size={16} />
            </div>
            <div className="mt-ai-bubble-container">
              <div className="mt-ai-bubble-body mt-ai-loading-bubble">
                <span className="mt-ai-typing-text">Analyzing routes & riding data</span>
                <span className="mt-ai-dot-flashing" />
              </div>
            </div>
          </div>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div className="mt-ai-error-banner">
            <AlertTriangle size={15} className="mt-ai-error-icon" />
            <div className="mt-ai-error-text">
              <strong>Notice:</strong> {errorMessage}
            </div>
            <button
              type="button"
              className="mt-ai-error-dismiss"
              onClick={() => setErrorMessage(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Section */}
      <div className="mt-ai-input-wrapper">
        <textarea
          ref={inputRef}
          className="mt-ai-input-area"
          rows={1}
          placeholder="Ask your AI co-pilot about routes, weather, fuel, or safety..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />

        <button
          type="button"
          className="mt-ai-send-btn"
          onClick={() => handleSend()}
          disabled={isLoading || !inputValue.trim()}
          aria-label="Send message"
        >
          <Send size={15} />
        </button>
      </div>

      <div className="mt-ai-input-footer">
        <span>Powered by MotoTribe Real-Time Intelligence & Gemini AI</span>
        <span>Shift + Enter for new line</span>
      </div>
    </div>
  );
}
