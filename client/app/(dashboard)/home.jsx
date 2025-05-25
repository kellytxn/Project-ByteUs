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
import { BACKEND_URL } from "../../config";

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
      const res = await axios.post(`${BACKEND_URL}/userData`, {
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
          <Text style={styles.name}>{userData.name}</Text>
          <Text style={styles.info}>Course: {userData.course}</Text>
          <Text style={styles.info}>Year: {userData.year}</Text>
          <Text style={styles.info}>Semester: {userData.semester}</Text>
          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
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
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 8,
    color: "#222",
  },
  info: {
    fontSize: 16,
    color: "#555",
    marginVertical: 2,
  },
  logoutButton: {
    marginTop: 15,
    backgroundColor: "#AE96C7",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
