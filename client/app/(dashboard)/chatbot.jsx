import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import MessageBubble from "../../components/chatbot/messageBubble";
import TypingIndicator from "../../components/chatbot/typingIndicator";
import PromptButton from "../../components/chatbot/promptButton";
import { fetchUserData } from "../../services/userService";
import { fetchGeminiResponse } from "../../services/chatbotService";
import { getToken, getMcsToGraduate } from "../../services/storageService";
import { calculateGpaMetrics } from "../../utils/gpa";
import styles from "../../components/chatbot/styles";

const USER_AVATAR = require("../../assets/Default.png.jpeg");

const Chatbot = () => {
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const [mcsToGrad, setMcsToGrad] = useState(null);
  const [isGeminiTyping, setIsGeminiTyping] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No token found");

        const response = await fetchUserData(token);
        if (response.status === "ok" && isMounted) {
          setUserData(response.data);
          const saved = await getMcsToGraduate(response.data.email);
          setMcsToGrad(saved);

          const welcomeMsg = {
            text: `Hello ${
              response.data?.name || "there"
            }! I'm your academic assistant — here to support you on your learning journey.\n\nHere are some common questions you might have — feel free to tap on any of them to get started!`,
            sender: "gemini",
          };
          setWelcomeMessage(welcomeMsg);
        } else if (isMounted) {
          throw new Error(response.data || "Failed to fetch user data");
        }
      } catch (error) {
        if (isMounted) console.error("Error fetching user data:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 2000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (userData?.profilePic) {
      setProfilePic(userData.profilePic);
    } else {
      setProfilePic(null);
    }
  }, [userData]);

  useEffect(() => {
    if (messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];
    const timer = setTimeout(() => {
      if (!flatListRef.current) return;

      if (latestMessage.sender === "gemini") {
        flatListRef.current.scrollToIndex({
          index: messages.length - 1,
          animated: true,
          viewPosition: 0,
        });
      } else {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [messages]);

  const handleModuleSuggestion = async () => {
    try {
      if (!userData) throw new Error("User data not available");
      setIsGeminiTyping(true);

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
    } finally {
      setIsGeminiTyping(false);
    }
  };

  const handleGpaBlueprint = async (targetGpa) => {
    try {
      if (!userData) throw new Error("User data or modules not available");
      setIsGeminiTyping(true);

      const { cumulativeGpa, totalUnits, unitsLeft } = calculateGpaMetrics(
        userData.modules,
        mcsToGrad
      );

      const prompt = `I am currently a Year ${userData.year}, Semester ${
        userData.semester
      } student at NUS. My cumulative GPA (CAP) is ${cumulativeGpa}, based on ${totalUnits} units completed. I have ${unitsLeft} units left. I am aiming for ${
        targetGpa === 4.5
          ? "First Class Honours (CAP ≥ 4.5)"
          : "Second Class Upper Honours (CAP ≥ 4.0)"
      }. What's the average GPA I need to achieve for my remaining units to reach that goal? The CAP is calculated using the following formula: CAP = (Σ (Grade Point × Module Units)) / (Σ Module Units)`;

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
      console.error("Error generating GPA blueprint:", err);
      const errorMessage = {
        text: userData
          ? "Error calculating GPA blueprint."
          : "Please complete your profile and modules to get a GPA blueprint.",
        sender: "gemini",
        id: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsGeminiTyping(false);
    }
  };

  const handleButtonClick = async () => {
    if (!msg.trim()) return;

    const userMessage = { text: msg, sender: "user", id: Date.now() };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setMsg("");
    setIsGeminiTyping(true);

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
    } finally {
      setIsGeminiTyping(false);
    }
  };

  const prompts = [
    {
      text: "What modules should I take this semester?",
      action: handleModuleSuggestion,
      id: "1",
    },
    {
      text: "How far am i from achieving first class honours?",
      action: () => handleGpaBlueprint(4.5),
      id: "2",
    },
    {
      text: "How far am i from achieving second upper class honours?",
      action: () => handleGpaBlueprint(4.0),
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
          renderItem={({ item }) => (
            <MessageBubble item={item} profilePic={profilePic} />
          )}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messagesContainer}
          ListHeaderComponent={
            <>
              {welcomeMessage && (
                <MessageBubble item={welcomeMessage} profilePic={null} />
              )}
              <FlatList
                data={prompts}
                renderItem={({ item }) => <PromptButton item={item} />}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={styles.promptsContainer}
              />
            </>
          }
          ListFooterComponent={isGeminiTyping ? <TypingIndicator /> : null}
          onScrollToIndexFailed={(info) => {
            const wait = new Promise((resolve) => setTimeout(resolve, 500));
            wait.then(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
              });
            });
          }}
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter your query"
            value={msg}
            onChangeText={setMsg}
            placeholderTextColor="#444"
          />
          <TouchableOpacity
            style={styles.button}
            onPress={handleButtonClick}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-up" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default Chatbot;
