import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BACKEND_URL } from "../../config";

const GEMINI_API_KEY = "AIzaSyBryT1JtHupeokQTfLZN-4ECCTo20kZEt4";

const renderFormattedText = (text) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <Text key={index} style={{ fontWeight: "bold", color: "black" }}>
          {part.slice(2, -2)}
        </Text>
      );
    } else {
      return <Text key={index}>{part}</Text>;
    }
  });
};

const Chatbot = () => {
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) throw new Error("No token found");

        const response = await fetch(`${BACKEND_URL}/userData`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();

        if (data.status === "ok") {
          setUserData(data.data);
          const welcomeMsg = {
            text: `Hello ${
              data.data?.name || "there"
            }! I'm your academic assistant. How can I help you today? Here are some questions you might want to ask:`,
            sender: "gemini",
          };
          setWelcomeMessage(welcomeMsg);
        } else {
          throw new Error(data.data || "Failed to fetch user data");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        const welcomeMsg = {
          text: "Hello there! I'm your academic assistant. How can I help you today? Here are some questions you might want to ask:",
          sender: "gemini",
        };
        setWelcomeMessage(welcomeMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const fetchGeminiResponse = async (prompt) => {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      const data = await response.json();
      const content = data?.candidates?.[0]?.content;
      return content?.parts?.[0]?.text || "No response";
    } catch (error) {
      console.error("Error:", error);
      return "Error occurred while fetching response";
    }
  };

  const handleModuleSuggestion = async () => {
    try {
      if (!userData) throw new Error("User data not available");

      const prompt = `I'm studying ${userData.course} in NUS. Recommend me some common modules to take in year ${userData.year} semester ${userData.semester}. Remember to provide the module's name and code!`;

      const userMessage = { text: prompt, sender: "user", id: Date.now() };
      setMessages((prev) => [...prev, userMessage]);

      const reply = await fetchGeminiResponse(prompt);
      const geminiMessage = {
        text: reply,
        sender: "gemini",
        id: Date.now() + 1,
      };
      setMessages((prev) => [...prev, geminiMessage]);
    } catch (err) {
      console.error("Error getting modules:", err);
      const errorMessage = {
        text: userData
          ? "Error fetching academic info"
          : "Please make sure your profile is complete to get module suggestions",
        sender: "gemini",
        id: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleButtonClick = async () => {
    if (!msg.trim()) return;

    const userMessage = { text: msg, sender: "user", id: Date.now() };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setMsg("");

    try {
      const reply = await fetchGeminiResponse(msg);
      const geminiMessage = {
        text: reply,
        sender: "gemini",
        id: Date.now() + 1,
      };
      setMessages((prevMessages) => [...prevMessages, geminiMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = {
        text: "Error occurred",
        sender: "gemini",
        id: Date.now(),
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    }
  };

  const messageSave = (text) => {
    setMsg(text);
  };

  const renderMessageItem = ({ item }) => {
    return (
      <View
        style={[
          styles.message,
          item.sender === "user" ? styles.userMessage : styles.geminiMessage,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            item.sender === "user"
              ? styles.userMessageText
              : styles.geminiMessageText,
          ]}
        >
          {renderFormattedText(item.text)}
        </Text>
      </View>
    );
  };

  const renderPromptItem = ({ item }) => {
    return (
      <TouchableOpacity style={styles.promptButton} onPress={item.action}>
        <Text style={styles.promptText}>{item.text}</Text>
      </TouchableOpacity>
    );
  };

  const prompts = [
    {
      text: "What modules should I take this semester?",
      action: handleModuleSuggestion,
      id: "1",
    },
    {
      text: "How to be productive?",
      action: async () => {
        const prompt = "How to be productive?";
        const userMessage = { text: prompt, sender: "user", id: Date.now() };
        setMessages((prev) => [...prev, userMessage]);
        const reply = await fetchGeminiResponse(prompt);
        const geminiMessage = {
          text: reply,
          sender: "gemini",
          id: Date.now() + 1,
        };
        setMessages((prev) => [...prev, geminiMessage]);
      },
      id: "2",
    },
    {
      text: "Help me prepare for finals",
      action: async () => {
        const prompt = "Help me prepare for finals";
        const userMessage = { text: prompt, sender: "user", id: Date.now() };
        setMessages((prev) => [...prev, userMessage]);
        const reply = await fetchGeminiResponse(prompt);
        const geminiMessage = {
          text: reply,
          sender: "gemini",
          id: Date.now() + 1,
        };
        setMessages((prev) => [...prev, geminiMessage]);
      },
      id: "3",
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#AE96C7" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 5 : 0}
    >
      <SafeAreaView style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messagesContainer}
          ListHeaderComponent={
            <>
              {welcomeMessage && (
                <View style={[styles.message, styles.geminiMessage]}>
                  <Text style={[styles.messageText, styles.geminiMessageText]}>
                    {renderFormattedText(welcomeMessage.text)}
                  </Text>
                </View>
              )}
              <FlatList
                data={prompts}
                renderItem={renderPromptItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={styles.promptsContainer}
              />
            </>
          }
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter Your Query"
            value={msg}
            onChangeText={messageSave}
            placeholderTextColor="#444"
          />
          <TouchableOpacity style={styles.button} onPress={handleButtonClick}>
            <Ionicons name="arrow-up" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default Chatbot;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EBE9E3" },
  messagesContainer: {
    padding: 10,
    paddingBottom: 80,
  },
  promptsContainer: {
    paddingVertical: 10,
  },
  message: {
    maxWidth: "80%",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  userMessage: {
    backgroundColor: "#9C7FC5",
    alignSelf: "flex-end",
  },
  geminiMessage: {
    backgroundColor: "white",
    alignSelf: "flex-start",
  },
  messageText: { color: "white" },
  userMessageText: { color: "white" },
  geminiMessageText: { color: "black" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "transparent",
  },
  input: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
    color: "black",
  },
  button: {
    backgroundColor: "#9C7FC5",
    borderRadius: 17.5,
    width: 35,
    height: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  promptButton: {
    backgroundColor: "#E0D8F0",
    padding: 12,
    borderRadius: 20,
    marginVertical: 5,
    alignSelf: "flex-start",
  },
  promptText: {
    color: "#5E4A8A",
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 20,
    backgroundColor: "#EBE9E3",
  },
  loadingText: {
    marginTop: 10,
    color: "#555",
  },
});
