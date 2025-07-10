import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Image,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
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
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    course: "",
    year: "",
    semester: "",
    mcsToGraduate: "",
  });
  const [totalModuleUnits, setTotalModuleUnits] = useState(0);

  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        try {
          const token = await AsyncStorage.getItem("token");
          if (!token) throw new Error("No token found");

          const res = await axios.post(`${BACKEND_URL}/userData`, { token });
          const freshUserData = res.data.data;

          setUserData(freshUserData);

          // Calculate total units after fetching new user data
          if (freshUserData?.modules) {
            const total = freshUserData.modules.reduce(
              (sum, module) => sum + Number(module.units || 0),
              0
            );
            setTotalModuleUnits(total);
          } else {
            setTotalModuleUnits(0);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserData(null);
          setTotalModuleUnits(0);
        }
      };

      fetchUserData();
    }, [])
  );

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
      const freshUserData = res.data.data;
      setUserData(freshUserData);
      if (freshUserData.profilePic) {
        setProfilePic(freshUserData.profilePic);
      }

      // Check for existing MCs in local storage
      const savedMCs = await AsyncStorage.getItem(
        `mcsToGraduate_${res.data.data.email}`
      );
      if (savedMCs) {
        setFormData((prev) => ({
          ...prev,
          mcsToGraduate: savedMCs,
        }));
      }
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

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      const token = await AsyncStorage.getItem("token");
      const base64 = result.assets[0].base64;
      setProfilePic(base64);

      try {
        await axios.post(`${BACKEND_URL}/uploadProfilePic`, {
          token,
          image: base64,
        });
      } catch (err) {
        console.error("Upload failed", err);
      }
    }
  };

  useEffect(() => {
    getData();
  }, []);

  useEffect(() => {
    if (userData) {
      setFormData((prev) => ({
        name: userData.name,
        course: userData.course,
        year: userData.year.toString(),
        semester: userData.semester.toString(),
        mcsToGraduate: prev.mcsToGraduate || "",
      }));
    }
  }, [userData]);

  const handleSave = async () => {
    const { name, course, year, semester, mcsToGraduate } = formData;

    if (!name || !course || !year || !semester) {
      Alert.alert("Please fill in all fields before saving.");
      return;
    }

    if (mcsToGraduate && mcsToGraduate.toLowerCase() !== "na") {
      const mcsNumber = Number(mcsToGraduate);
      if (isNaN(mcsNumber)) {
        Alert.alert("Please enter a valid number for MCs to Graduate.");
        return;
      }

      if (mcsNumber < totalModuleUnits) {
        Alert.alert(
          "Invalid MCs to Graduate",
          `MCs to Graduate (${mcsNumber}) cannot be less than total units of modules (${totalModuleUnits}) created.`
        );
        return;
      }
    }

    try {
      const token = await AsyncStorage.getItem("token");

      if (!mcsToGraduate || mcsToGraduate.toLowerCase() === "na") {
        await AsyncStorage.removeItem(`mcsToGraduate_${userData.email}`);
      } else {
        await AsyncStorage.setItem(
          `mcsToGraduate_${userData.email}`,
          mcsToGraduate
        );
      }

      // Save other form fields to backend
      const { mcsToGraduate: _, ...formDataToSend } = formData;
      const res = await axios.post(`${BACKEND_URL}/updateUserData`, {
        token,
        ...formDataToSend,
      });

      setUserData(res.data.data);
      setFormData((prev) => ({
        ...prev,
        mcsToGraduate: mcsToGraduate,
      }));
      setIsEditing(false);
    } catch (err) {
      setError("Failed to update data");
    }
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#AE96C7" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={() => router.replace("/")}
            style={styles.errorButton}
          >
            <Text style={styles.errorButtonText}>Return to Login</Text>
          </Pressable>
        </View>
      ) : userData ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.name}>{userData.name}</Text>
          </View>
          <View style={styles.profileSection}>
            <Pressable onPress={pickImage} style={styles.profileImageContainer}>
              {profilePic ? (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${profilePic}` }}
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

          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Pressable onPress={() => setIsEditing(!isEditing)}>
                <Ionicons
                  name={isEditing ? "close" : "create"}
                  size={22}
                  color="#AE96C7"
                />
              </Pressable>
            </View>

            {isEditing && (
              <>
                <View style={styles.infoRow}>
                  <Ionicons name="person" size={22} color="#AE96C7" />
                  <Text style={styles.infoLabel}>Name:</Text>
                  <TextInput
                    value={formData.name}
                    onChangeText={(text) =>
                      setFormData({ ...formData, name: text })
                    }
                    style={styles.input}
                  />
                </View>
                <View style={styles.divider} />
              </>
            )}

            <View style={styles.infoRow}>
              <Ionicons name="book" size={22} color="#AE96C7" />
              <Text style={styles.infoLabel}>Course:</Text>
              {isEditing ? (
                <TextInput
                  value={formData.course}
                  onChangeText={(text) =>
                    setFormData({ ...formData, course: text })
                  }
                  style={styles.input}
                />
              ) : (
                <Text style={styles.infoValue}>{userData.course}</Text>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Ionicons name="time" size={22} color="#AE96C7" />
              <Text style={styles.infoLabel}>Year:</Text>
              {isEditing ? (
                <TextInput
                  value={formData.year}
                  onChangeText={(text) =>
                    setFormData({ ...formData, year: text })
                  }
                  style={styles.input}
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.infoValue}>{userData.year}</Text>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={22} color="#AE96C7" />
              <Text style={styles.infoLabel}>Semester:</Text>
              {isEditing ? (
                <TextInput
                  value={formData.semester}
                  onChangeText={(text) =>
                    setFormData({ ...formData, semester: text })
                  }
                  style={styles.input}
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.infoValue}>{userData.semester}</Text>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Ionicons name="school" size={22} color="#AE96C7" />
              <Text style={styles.infoLabel}>MCs Required:</Text>
              {isEditing ? (
                <TextInput
                  value={formData.mcsToGraduate}
                  onChangeText={(text) =>
                    setFormData({ ...formData, mcsToGraduate: text })
                  }
                  style={styles.input}
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.infoValue}>
                  {isEditing
                    ? formData.mcsToGraduate
                    : isNaN(Number(formData.mcsToGraduate)) ||
                      formData.mcsToGraduate === ""
                    ? "N/A"
                    : formData.mcsToGraduate}
                </Text>
              )}
            </View>

            {isEditing && (
              <Pressable
                onPress={handleSave}
                style={styles.saveButton}
                android_ripple={{ color: "#9C7FC5" }}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={handleLogout}
            style={styles.logoutButton}
            android_ripple={{ color: "#9C7FC5" }}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </ScrollView>
      ) : null}
    </View>
  );
};

export default Home;

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
    marginTop: 10,
    color: "#555",
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
    paddingVertical: 10,
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 0,
    alignSelf: "flex-end",
    marginTop: -10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#EBE9E3",
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    backgroundColor: "#FFF",
    marginLeft: 10,
  },
  saveButton: {
    backgroundColor: "#AE96C7",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 15,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
