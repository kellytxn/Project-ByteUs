import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  Pressable,
  View,
  ScrollView,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { useRouter, Link } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import FormInput from "../../components/auth/formInput";
import DropdownInput from "../../components/auth/dropDownInput";
import ErrorMessage from "../../components/auth/errorMessage";
import { validateEmail } from "../../utils/validation";
import { registerUser, loginUser } from "../../services/authService";

const yearOptions = [...Array(6)].map((_, i) => ({
  label: `Year ${i + 1}`,
  value: (i + 1).toString(),
}));

const semesterOptions = [
  { label: "Semester 1", value: "1" },
  { label: "Semester 2", value: "2" },
];

const RegisterScreen = () => {
  const [fullName, setFullName] = useState("");
  const [course, setCourse] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const router = useRouter();

  const handleRegister = async () => {
    setError(null);

    if (!fullName || !course || !year || !semester || !email || !password) {
      Alert.alert("Please fill all fields");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Invalid email address");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Password must be at least 8 characters");
      return;
    }

    try {
      const registerData = await registerUser(userData);

      if (registerData.status !== "ok") {
        setError(registerData.data || "Registration failed");
        return;
      }

      const loginData = await loginUser({ email, password });

      if (loginData.status === "ok") {
        const token = loginData.data;
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
            <FormInput
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
            />
            <FormInput
              label="Course"
              value={course}
              onChangeText={setCourse}
              placeholder="Enter your course"
            />
            <DropdownInput
              label="Year"
              value={year}
              onChange={setYear}
              data={yearOptions}
              placeholder="Select year"
            />
            <DropdownInput
              label="Semester"
              value={semester}
              onChange={setSemester}
              data={semesterOptions}
              placeholder="Select semester"
            />
            <FormInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
            />
            <FormInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter a password"
              secureTextEntry
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

            <ErrorMessage message={error} />
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </KeyboardAwareScrollView>
  );
};

export default RegisterScreen;

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
});
