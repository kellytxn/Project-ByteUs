import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { Link, useRouter } from "expo-router";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BACKEND_URL } from "../../config";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const router = useRouter();

  const handleLogin = async () => {
    setError(null);
    const userData = {
      email: email,
      password: password,
    };

    axios
      .post(`${BACKEND_URL}/login`, userData)
      .then((res) => {
        console.log(res.data);
        if (res.data.status === "ok") {
          console.log("Login successful, navigating to /home");
          AsyncStorage.setItem("token", res.data.data);
          router.replace("/home");
        } else {
          setError(res.data.data || "Invalid email or password");
        }
      })
      .catch((error) => {
        if (error.response && error.response.data) {
          setError(error.response.data.data || "Invalid email or password");
        } else {
          setError(error.message);
        }
      });
  };

  return (
    <KeyboardAwareScrollView
      extraScrollHeight={80}
      enableOnAndroid={Platform.OS === "android"}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.container}
      style={{ backgroundColor: "#EBE9E3" }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <Image
            source={require("../../assets/Logo.png")}
            style={styles.logo}
          />

          <TextInput
            style={[styles.input, { width: 300 }]}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={[styles.input, { width: 300 }]}
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            onPress={handleLogin}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>Login</Text>
          </Pressable>

          <Link href="/register" asChild>
            <Pressable style={styles.linkButton}>
              <Text style={styles.linkText}>
                Don't have an account? Register
              </Text>
            </Pressable>
          </Link>

          {error && <Text style={styles.error}>{error}</Text>}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAwareScrollView>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EBE9E3",
    paddingHorizontal: 30,
  },
  logo: {
    width: 250,
    height: 250,
    borderRadius: 125,
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    marginBottom: 30,
    fontWeight: "bold",
    color: "#B2CBDB",
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
    backgroundColor: "#B2CBDB",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 10,
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
    color: "grey",
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
});
