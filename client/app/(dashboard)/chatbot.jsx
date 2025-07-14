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
  Image,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BACKEND_URL } from "../../config";

const GEMINI_API_KEY = "AIzaSyBryT1JtHupeokQTfLZN-4ECCTo20kZEt4";
const USER_AVATAR = require("../../assets/Default.png.jpeg");

// Handle formatting
const renderFormattedText = (text) => {
  const lines = text.split("\n");
  const result = [];

  lines.forEach((line, lineIndex) => {
    if (line.trim() === "") {
      result.push(<Text key={`empty-${lineIndex}`}>{"\n"}</Text>);
      return;
    }

    // Handle bullet points
    if (/^\*\s/.test(line)) {
      result.push(
        <Text key={`bullet-${lineIndex}`} style={{ marginLeft: 10 }}>
          {"\n• "}
          {line.substring(2).trim()}
        </Text>
      );
      return;
    }
    const parts = [];
    let remainingText = line;
    while (remainingText.length > 0) {
      // Check for bold italic
      const boldItalicMatch = remainingText.match(/^\*\*\*([^*]+)\*\*\*/);
      if (boldItalicMatch) {
        parts.push(
          <Text
            key={`bi-${lineIndex}-${parts.length}`}
            style={{ fontWeight: "bold", fontStyle: "italic" }}
          >
            {boldItalicMatch[1]}
          </Text>
        );
        remainingText = remainingText.substring(boldItalicMatch[0].length);
        continue;
      }

      // Check for bold
      const boldMatch = remainingText.match(/^\*\*([^*]+)\*\*/);
      if (boldMatch) {
        parts.push(
          <Text
            key={`b-${lineIndex}-${parts.length}`}
            style={{ fontWeight: "bold" }}
          >
            {boldMatch[1]}
          </Text>
        );
        remainingText = remainingText.substring(boldMatch[0].length);
        continue;
      }

      // Check for italic
      const italicMatch = remainingText.match(/^\*([^*]+)\*/);
      if (italicMatch) {
        parts.push(
          <Text
            key={`i-${lineIndex}-${parts.length}`}
            style={{ fontStyle: "italic" }}
          >
            {italicMatch[1]}
          </Text>
        );
        remainingText = remainingText.substring(italicMatch[0].length);
        continue;
      }

      const nextFormat = remainingText.search(/\*\*\*|\*\*|\*/);
      if (nextFormat >= 0) {
        parts.push(
          <Text key={`t-${lineIndex}-${parts.length}`}>
            {remainingText.substring(0, nextFormat)}
          </Text>
        );
        remainingText = remainingText.substring(nextFormat);
      } else {
        parts.push(
          <Text key={`t-${lineIndex}-${parts.length}`}>{remainingText}</Text>
        );
        remainingText = "";
      }
    }

    result.push(<Text key={`line-${lineIndex}`}>{parts}</Text>);
  });

  return result;
};

const TypingIndicator = () => {
  const [dotAnimations] = useState([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]);

  useEffect(() => {
    const animateDots = () => {
      const animations = dotAnimations.map((anim, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 200),
            Animated.timing(anim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ])
        )
      );

      animations.forEach((anim) => anim.start());

      return () => animations.forEach((anim) => anim.stop());
    };

    animateDots();
  }, []);

  return (
    <View style={[styles.messageRow, { flexDirection: "row" }]}>
      <View style={[styles.message, styles.geminiMessage]}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={[styles.messageText, styles.geminiMessageText]}>
            Typing
          </Text>
          {dotAnimations.map((anim, index) => (
            <Animated.Text
              key={index}
              style={[
                styles.messageText,
                styles.geminiMessageText,
                {
                  opacity: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                },
              ]}
            >
              .
            </Animated.Text>
          ))}
        </View>
      </View>
    </View>
  );
};

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

        if (data.status === "ok" && isMounted) {
          setUserData(data.data);
          const saved = await AsyncStorage.getItem(
            `mcsToGraduate_${data.data.email}`
          );

          const savedNumber = Number(saved);
          if (saved && !isNaN(savedNumber)) {
            setMcsToGrad(savedNumber);
          } else {
            setMcsToGrad(null);
          }
          const welcomeMsg = {
            text: `Hello ${
              data.data?.name || "there"
            }! I'm your academic assistant — here to support you on your learning journey.\n\nHere are some common questions you might have — feel free to tap on any of them to get started!`,
            sender: "gemini",
          };

          setWelcomeMessage(welcomeMsg);
        } else if (isMounted) {
          throw new Error(data.data || "Failed to fetch user data");
        }
      } catch (error) {
        if (isMounted) console.error("Error fetching user data:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchUserData();
    const intervalId = setInterval(() => {
      fetchUserData();
    }, 2000);
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

  const handleGpaBlueprint = async () => {
    try {
      if (!userData) throw new Error("User data or modules not available");
      setIsGeminiTyping(true);

      const gradePointMap = {
        "A+": 5.0,
        A: 5.0,
        "A-": 4.5,
        "B+": 4.0,
        B: 3.5,
        "B-": 3.0,
        "C+": 2.5,
        C: 2.0,
        "D+": 1.5,
        D: 1.0,
        F: 0.0,
      };

      const completedUnits = userData.modules
        .filter((mod) => mod.completed)
        .reduce((sum, mod) => sum + mod.units, 0);

      const total =
        mcsToGrad || userData.modules.reduce((sum, mod) => sum + mod.units, 0);

      const unitsLeft = total - completedUnits;

      // Filter only completed, graded, and not SU
      const completedModules = userData.modules.filter(
        (mod) =>
          mod.completed && mod.grade !== "CS" && mod.grade !== "CU" && !mod.isSU
      );

      // Calculate total units and weighted GPA sum
      let totalUnits = 0;
      let weightedGpaSum = 0;

      completedModules.forEach((mod) => {
        const gradePoint = gradePointMap[mod.grade];
        if (gradePoint !== undefined) {
          totalUnits += mod.units;
          weightedGpaSum += gradePoint * mod.units;
        }
      });

      const cumulativeGpa =
        totalUnits > 0 ? (weightedGpaSum / totalUnits).toFixed(2) : "0.00";

      const prompt = `I am currently a Year ${userData.year}, Semester ${userData.semester} student at NUS. My cumulative GPA (CAP) is ${cumulativeGpa}, based on ${totalUnits} units completed. I have ${unitsLeft} units left. I am aiming for First Class Honours (CAP ≥ 4.5). What's the average GPA I need to achieve for my remaining units to reach that goal? The CAP is calculated using the following formula: CAP = (Σ (Grade Point × Module Units)) / (Σ Module Units)`;
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

  const handleGpaBlueprint2 = async () => {
    try {
      if (!userData) throw new Error("User data or modules not available");
      setIsGeminiTyping(true);

      const gradePointMap = {
        "A+": 5.0,
        A: 5.0,
        "A-": 4.5,
        "B+": 4.0,
        B: 3.5,
        "B-": 3.0,
        "C+": 2.5,
        C: 2.0,
        "D+": 1.5,
        D: 1.0,
        F: 0.0,
      };

      const completedUnits = userData.modules
        .filter((mod) => mod.completed)
        .reduce((sum, mod) => sum + mod.units, 0);

      const total =
        mcsToGrad || userData.modules.reduce((sum, mod) => sum + mod.units, 0);

      const unitsLeft = total - completedUnits;

      // Filter only completed, graded, and not SU
      const completedModules = userData.modules.filter(
        (mod) =>
          mod.completed && mod.grade !== "CS" && mod.grade !== "CU" && !mod.isSU
      );

      // Calculate total units and weighted GPA sum
      let totalUnits = 0;
      let weightedGpaSum = 0;

      completedModules.forEach((mod) => {
        const gradePoint = gradePointMap[mod.grade];
        if (gradePoint !== undefined) {
          totalUnits += mod.units;
          weightedGpaSum += gradePoint * mod.units;
        }
      });

      const cumulativeGpa =
        totalUnits > 0 ? (weightedGpaSum / totalUnits).toFixed(2) : "0.00";

      const prompt = `I am currently a Year ${userData.year}, Semester ${userData.semester} student at NUS. My cumulative GPA (CAP) is ${cumulativeGpa}, based on ${totalUnits} units completed. I have ${unitsLeft} units left. I am aiming for Second Class Upper Honours (CAP ≥ 4.0). What's the average GPA I need to achieve for my remaining units to reach that goal? The CAP is calculated using the following formula: CAP = (Σ (Grade Point × Module Units)) / (Σ Module Units)`;
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

  const messageSave = (text) => {
    setMsg(text);
  };

  const renderMessageItem = ({ item }) => {
    const isUser = item.sender === "user";

    return (
      <View
        style={[
          styles.messageRow,
          { flexDirection: isUser ? "row-reverse" : "row" },
        ]}
      >
        {isUser && (
          <Image
            source={
              profilePic
                ? { uri: `data:image/jpeg;base64,${profilePic}` }
                : USER_AVATAR
            }
            style={styles.avatar}
          />
        )}

        <View
          style={[
            styles.message,
            isUser ? styles.userMessage : styles.geminiMessage,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.geminiMessageText,
            ]}
          >
            {renderFormattedText(item.text)}
          </Text>
        </View>
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
      text: "How far am i from achieving first class honours?",
      action: handleGpaBlueprint,
      id: "2",
    },
    {
      text: "How far am i from achieving second upper class honours?",
      action: handleGpaBlueprint2,
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
          ListFooterComponent={isGeminiTyping ? <TypingIndicator /> : null}
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter your query"
            value={msg}
            onChangeText={messageSave}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EBE9E3" },
  messagesContainer: {
    padding: 10,
    paddingBottom: 10,
  },
  promptsContainer: {
    paddingVertical: 10,
    maxWidth: "70%",
  },
  message: {
    maxWidth: "70%",
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
    maxWidth: "70%",
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
  messageRow: {
    alignItems: "flex-start",
    marginBottom: 5,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 1.5,
  },
});
