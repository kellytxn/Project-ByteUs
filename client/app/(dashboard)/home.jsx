import { StyleSheet, Text, View, Pressable } from "react-native";
import React, { useEffect, useState } from "react";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

const Home = () => {
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const router = useRouter();

  async function getData() {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        setError("No token found.");
        return;
      }

      const res = await axios.post("http://192.168.1.109:5001/userData", {
        token,
      });

      setUserData(res.data.data);
    } catch (err) {
      setError("Failed to fetch user data.");
    }
  }

  async function handleLogout() {
    await AsyncStorage.removeItem("token");
    router.replace("/login");
  }

  useEffect(() => {
    getData();
  }, []);

  return (
    <View style={styles.container}>
      {error ? (
        <Text style={{ color: "red" }}>{error}</Text>
      ) : userData ? (
        <>
          <Text>Welcome, {userData.name}</Text>
          <Text>{userData.email}</Text>

          <Pressable onPress={handleLogout} style={styles.button}>
            <Text style={styles.buttonText}>Logout</Text>
          </Pressable>
        </>
      ) : (
        <Text>Loading...</Text>
      )}
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
