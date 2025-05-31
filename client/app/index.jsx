import {
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const Home = () => {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check if user is logged in
  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem("token");

        if (token) {
          router.replace("/home");
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error reading token from AsyncStorage:", error);
        setIsLoading(false);
      }
    };

    checkToken();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#AE96C7" />
        <Text style={{ marginTop: 10, color: "#555" }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={require("../assets/Logo.png")} style={styles.logo} />

      <View style={styles.linkContainer}>
        <Pressable
          onPress={() => router.push("/login")}
          style={({ pressed }) => [styles.box, pressed && styles.pressedBox]}
          hitSlop={20}
        >
          <Text style={styles.linkText}>Login</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/register")}
          style={({ pressed }) => [styles.box, pressed && styles.pressedBox]}
          hitSlop={20}
        >
          <Text style={styles.linkText}>Register</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EBE9E3",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EBE9E3",
  },
  logo: {
    width: 250,
    height: 250,
    borderRadius: 125,
    marginBottom: 40,
  },
  linkContainer: {
    gap: 20,
    alignItems: "center",
  },
  box: {
    backgroundColor: "#F3F5F9",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: "center",
    width: 200,
  },
  linkText: {
    fontSize: 18,
    color: "#333",
    fontWeight: "bold",
  },
});
