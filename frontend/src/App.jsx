import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Sidebar from "./components/Sidebar/Sidebar";
import ChatHeader from "./components/ChatHeader/ChatHeader";
import MessageList from "./components/MessageList/MessageList";
import ChatInput from "./components/ChatInput/ChatInput";
import "./App.css";

const API_BASE_URL = "http://localhost:3788/api";

function App() {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);

  // Scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  // Fetch conversations on page load
  useEffect(() => {
    fetchConversations();
  }, []);

  // Auto scroll when messages update
  useEffect(() => {
    scrollToBottom();
  }, [conversations, isLoading]);

  // =========================
  // FETCH CONVERSATIONS
  // =========================
  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/chat/conversations`);

      console.log("FETCH RESPONSE:", response.data);

      if (response.data?.success) {
        const conversationsData = response.data?.data?.conversations;

        // Ensure conversations is ALWAYS an array
        setConversations(
          Array.isArray(conversationsData) ? conversationsData : [],
        );
      } else {
        setConversations([]);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);

      // Prevent React crash
      setConversations([]);
    }
  };

  // =========================
  // SEND MESSAGE
  // =========================
  const handleSendMessage = async (question) => {
    if (!question.trim()) return;

    // Temporary user message
    const tempUserMessage = {
      id: Date.now(),
      role: "user",
      content: question,
    };

    // Safely update state
    setConversations((prev = []) => [...prev, tempUserMessage]);

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/chat/conversations`, {
        question,
      });

      console.log("POST RESPONSE:", response.data);

      if (response.data?.success) {
        const { userConversation, assistantConversation } =
          response.data.data || {};

        setConversations((prev = []) => {
          // Remove temp message
          const filtered = prev.filter((msg) => msg.id !== tempUserMessage.id);

          return [
            ...filtered,

            // Real user message
            userConversation || {
              id: Date.now(),
              role: "user",
              content: question,
            },

            // Assistant message
            assistantConversation || {
              id: Date.now() + 1,
              role: "assistant",
              content: "No response received",
            },
          ];
        });
      } else {
        throw new Error("Backend response failed");
      }
    } catch (error) {
      console.error("Error posting conversation:", error);

      // Remove temporary user message
      setConversations((prev = []) =>
        prev.filter((msg) => msg.id !== tempUserMessage.id),
      );

      // Backend error message
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "There was an error generating a response.";

      // Add assistant error message
      const errorConversation = {
        id: Date.now() + 1,
        role: "assistant",
        content: errorMessage,
      };

      setConversations((prev = []) => [...prev, errorConversation]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <Sidebar />

      <main className="chat">
        <ChatHeader />

        <MessageList
          conversations={Array.isArray(conversations) ? conversations : []}
          isLoading={isLoading}
          messagesEndRef={messagesEndRef}
        />

        <ChatInput
          handleSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}

export default App;
