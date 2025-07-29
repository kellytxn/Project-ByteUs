import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  View,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Alert,
} from "react-native";
import { Link, useRouter } from "expo-router";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BACKEND_URL } from "../../config";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Dropdown } from "react-native-element-dropdown";

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [course, setCourse] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const router = useRouter();

  const yearOptions = [
    { label: "First year", value: "1" },
    { label: "Second year", value: "2" },
    { label: "Third year", value: "3" },
    { label: "Fourth year", value: "4" },
    { label: "Fifth year", value: "5" },
    { label: "Sixth year", value: "6" },
  ];

  const semesterOptions = [
    { label: "First semester", value: "1" },
    { label: "Second semester", value: "2" },
  ];

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const handleRegister = async () => {
    setError(null);

    if (!fullName || !course || !year || !semester || !email || !password) {
      Alert.alert("Please fill all fields");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Please enter a valid email address");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Password must be at least 8 characters long");
      return;
    }

    const userData = {
      name: fullName,
      course: course,
      year: year,
      semester: semester,
      email: email,
      password: password,
    };

    try {
      const registerRes = await axios.post(`${BACKEND_URL}/register`, userData);

      if (registerRes.data.status !== "ok") {
        setError(registerRes.data.data || "Registration failed");
        return;
      }

      const loginRes = await axios.post(`${BACKEND_URL}/login`, {
        email,
        password,
      });

      if (loginRes.data.status === "ok") {
        const token = loginRes.data.data;
        await AsyncStorage.setItem("token", token);
        router.replace("/home");
      } else {
        setError("Login failed after registration");
      }
    } catch (err) {
      console.log(err);
      if (err.response?.data?.data) {
        setError(err.response.data.data);
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <KeyboardAwareScrollView
      extraScrollHeight={100}
      enableOnAndroid={Platform.OS === "android"}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.container}
      style={{ backgroundColor: "#EBE9E3" }}
    >
      <ScrollView style={styles.container}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Course</Text>
            <TextInput
              style={styles.input}
              value={course}
              onChangeText={setCourse}
              placeholder="Enter your course"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Year</Text>
            <Dropdown
              style={styles.dropdown}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              inputSearchStyle={styles.inputSearchStyle}
              data={yearOptions}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder="Select year"
              value={year}
              onChange={(item) => setYear(item.value)}
            />

            <Text style={styles.label}>Semester</Text>
            <Dropdown
              style={styles.dropdown}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              inputSearchStyle={styles.inputSearchStyle}
              data={semesterOptions}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder="Select semester"
              value={semester}
              onChange={(item) => setSemester(item.value)}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="Enter a password"
              placeholderTextColor="#999"
            />

            <Pressable
              onPress={handleRegister}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.buttonText}>Register</Text>
            </Pressable>

            <Link href="/login" asChild>
              <Pressable style={styles.linkButton}>
                <Text style={styles.linkText}>
                  Already have an account? Login
                </Text>
              </Pressable>
            </Link>
            {error && <Text style={styles.error}>{error}</Text>}
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </KeyboardAwareScrollView>
  );
};

export default Register;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EBE9E3",
    paddingHorizontal: 30,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  label: {
    alignSelf: "flex-start",
    marginLeft: 10,
    marginBottom: 6,
    color: "#999",
    fontWeight: "600",
  },
  input: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 16,
    borderColor: "#ccc",
    borderWidth: 1,
  },
  button: {
    backgroundColor: "#DFB6CF",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 8,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  pressed: {
    opacity: 0.8,
  },
  linkButton: {
    marginTop: 5,
  },
  linkText: {
    color: "#888",
    fontSize: 13,
    textDecorationLine: "underline",
  },
  error: {
    color: "#B00020",
    backgroundColor: "#FDECEA",
    borderColor: "#F5C6CB",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 15,
    fontSize: 14,
    textAlign: "center",
    width: "100%",
  },
  dropdown: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    backgroundColor: "#fff",
    width: "100%",
  },
  placeholderStyle: {
    fontSize: 16,
    color: "#999",
  },
  selectedTextStyle: {
    fontSize: 16,
    color: "#444",
  },
});