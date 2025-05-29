import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { BACKEND_URL } from "../../config";

const Home = () => {
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profilePic, setProfilePic] = useState(null);
  const router = useRouter();

  async function getData() {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        setError("No token found.");
        setIsLoading(false);
        return;
      }
      
      // Fetch user data
      const res = await axios.post(`${BACKEND_URL}/userData`, {
        token,
      });
      setUserData(res.data.data);
      
      // Check for existing profile picture in local storage
      const savedImage = await AsyncStorage.getItem("profilePic");
      if (savedImage) setProfilePic(savedImage);
    } catch (err) {
      setError("Failed to fetch user data.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("profilePic");
    router.replace("/");
  }

  const pickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Sorry, we need camera roll permissions!");
      return;
    }

    // Launch image picker
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfilePic(result.assets[0].uri);
      // Save profile picture URI to local storage
      await AsyncStorage.setItem("profilePic", result.assets[0].uri);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  return (
    <View style={styles.container}>
      {/* Loading State */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#AE96C7" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => router.replace("/")} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Return to Login</Text>
          </Pressable>
        </View>
      ) : userData ? (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Header */}
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.name}>{userData.name}</Text>
          </View>
          
          {/* Profile Image */}
          <View style={styles.profileSection}>
            <Pressable onPress={pickImage} style={styles.profileImageContainer}>
              {profilePic ? (
                <Image 
                  source={{ uri: profilePic }} 
                  style={styles.profileImage} 
                />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Ionicons name="person" size={42} color="#AE96C7" />
                </View>
              )}
              <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={18} color="white" />
              </View>
            </Pressable>
          </View>
          
          {/* User Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="book" size={22} color="#AE96C7" />
              <Text style={styles.infoLabel}>Course:</Text>
              <Text style={styles.infoValue}>{userData.course}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Ionicons name="school" size={22} color="#AE96C7" />
              <Text style={styles.infoLabel}>Year:</Text>
              <Text style={styles.infoValue}>{userData.year}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={22} color="#AE96C7" />
              <Text style={styles.infoLabel}>Semester:</Text>
              <Text style={styles.infoValue}>{userData.semester}</Text>
            </View>
          </View>
          
          {/* Logout Button */}
          <Pressable 
            onPress={handleLogout} 
            style={styles.logoutButton}
            android_ripple={{ color: '#9C7FC5' }}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </ScrollView>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EBE9E3",
    paddingTop: 20, 
  },
  scrollContent: {
    flexGrow: 1,
    padding: 25,
    paddingTop: 35, 
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 20, 
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: "#555",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    paddingTop: 50, 
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 18,
    textAlign: "center",
    marginVertical: 20,
    fontWeight: "500",
  },
  errorButton: {
    backgroundColor: "#AE96C7",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 15,
  },
  errorButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    marginBottom: 30,
    alignItems: "center",
    marginTop: 10, 
  },
  welcomeText: {
    fontSize: 22,
    color: "#555",
    marginBottom: 10,
  },
  name: {
    fontSize: 28,
    fontWeight: "700",
    color: "#222",
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 30,
    marginTop: 0,
  },
  profileImageContainer: {
    position: "relative",
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: "#EBE9E3",
  },
  profilePlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#F5F2F8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#EBE9E3",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "#AE96C7",
    borderRadius: 20,
    padding: 8,
  },
  infoCard: {
    backgroundColor: "white",
    borderRadius: 20,
    width: "100%",
    padding: 20,
    marginBottom: 30,
    marginTop: 15,
    shadowColor: "#AE96C7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  infoLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: "#555",
    fontWeight: "500",
    width: 90,
  },
  infoValue: {
    fontSize: 16,
    color: "#222",
    fontWeight: "500",
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#EBE9E3",
    marginVertical: 5,
  },
  logoutButton: {
    backgroundColor: "#AE96C7",
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 15,
    alignItems: "center",
    width: "100%",
    maxWidth: 300,
    shadowColor: "#AE96C7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 15,
  },
  logoutText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default Home;