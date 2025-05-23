import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
} from "react-native";
import React, { useEffect, useState } from "react";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

const Home = () => {
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  async function getData() {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        setError("No token found.");
        setIsLoading(false);
        return;
      }

      const res = await axios.post("http://192.168.1.109:5001/userData", {
        token,
      });

      setUserData(res.data.data);
    } catch (err) {
      setError("Failed to fetch user data.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    await AsyncStorage.removeItem("token");
    router.replace("/");
  }

  useEffect(() => {
    getData();
  }, []);

  return (
    <View style={styles.container}>
      {isLoading ? (
        <>
          <ActivityIndicator size="large" color="#AE96C7" />
          <Text style={{ marginTop: 10, color: "#555" }}>Loading...</Text>
        </>
      ) : error ? (
        <Text style={{ color: "red" }}>{error}</Text>
      ) : userData ? (
        <>
          <Text style={styles.welcomeText}>Welcome, {userData.name}</Text>
          <Text style={styles.emailText}>{userData.email}</Text>

          <Pressable onPress={handleLogout} style={styles.button}>
            <Text style={styles.buttonText}>Logout</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EBE9E3",
    paddingHorizontal: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#AE96C7",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 20,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});
