import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { Link, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import CustomInput from "../../components/auth/customInput";
import ErrorMessage from "../../components/auth/errorMessage";
import { login } from "../../services/authService";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleLogin = async () => {
    setError(null);
    try {
      const res = await login(email, password);
      if (res.status === "ok") {
        await AsyncStorage.setItem("token", res.data);
        router.replace("/home");
      } else {
        setError(res.data || "Invalid email or password");
      }
    } catch (err) {
      setError(err.response?.data?.data || err.message);
    }
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

          <CustomInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
          />
          <CustomInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
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

          <ErrorMessage message={error} />
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
  button: {
    backgroundColor: "#9DBDCE",
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
});
