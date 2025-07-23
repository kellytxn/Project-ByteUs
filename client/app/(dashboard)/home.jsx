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
  FlatList,
  Modal,
  Button,
  TouchableOpacity,
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
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showFriends, setShowFriends] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [currentTab, setCurrentTab] = useState("profile");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [selfModalVisible, setSelfModalVisible] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      fetchAll();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAll = async () => {
    const freshUserData = await refetch();
    if (freshUserData?.friends?.length) {
      await fetchFriends(freshUserData.friends);
    } else {
      setFriends([]);
    }
  };

  // Fetch exisiting friends
  const fetchFriends = async (friendIds) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.post(
        `${BACKEND_URL}/getFriendsDetails`,
        { friendIds },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setFriends(response.data.friends);
    } catch (error) {
      console.error("Error fetching friends:", error);
      setFriends([]);
    }
  };

  // Fetch pending requests
  const fetchPendingRequests = async () => {
    try {
      if (!userData?._id) return;

      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${BACKEND_URL}/pendingFriendRequests/${userData._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setPendingRequests(response.data.requests);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      setPendingRequests([]);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, [userData]);

  // Accept or delete request
  const handleFriendRequest = async (requestId, action) => {
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.post(`${BACKEND_URL}/${action}FriendRequest`, {
        requestId,
        token,
      });
      fetchPendingRequests();
      if (action === "accept") {
        // Refresh friends list after accepting
        const updatedUser = await axios.post(`${BACKEND_URL}/userData`, {
          token,
        });
        setUserData(updatedUser.data.data);
        fetchFriends(updatedUser.data.data.friends);
      }
    } catch (error) {
      console.error(`Error ${action}ing friend request:`, error);
      Alert.alert("Error", `Failed to ${action} friend request`);
    }
  };

  //Sending friend request
  const sendFriendRequest = async (email) => {
    try {
      if (!userData?.email) {
        Alert.alert("Error", "Your user information is not available");
        return;
      }

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert(
          "Error",
          "You need to be logged in to send friend requests"
        );
        return;
      }

      // Basic email validation
      if (!email || !email.includes("@")) {
        Alert.alert("Error", "Please enter a valid email address");
        return;
      }

      // Don't allow sending to yourself
      if (email.toLowerCase() === userData.email.toLowerCase()) {
        Alert.alert("Error", "You cannot send a friend request to yourself");
        return;
      }

      const response = await axios.post(
        `${BACKEND_URL}/sendFriendRequest`,
        {
          fromEmail: userData.email,
          toEmail: email,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      Alert.alert("Success", response.data.message);

      fetchPendingRequests();
    } catch (error) {
      let errorMessage = "Failed to send friend request";

      try {
        if (error.response) {
          if (error.response.status === 400) {
            errorMessage = error.response.data.message || errorMessage;
          } else if (error.response.status === 401) {
            errorMessage = "Session expired. Please login again";
          } else if (error.response.status === 404) {
            errorMessage = "User not found. Please check the email address";
          }
        }
      } catch (nestedErr) {
        if (__DEV__)
          console.log("Nested error while handling error:", nestedErr);
      }

      Alert.alert("Error", errorMessage);
    }
  };

  // Delete friend
  const handleDeleteFriend = async (friendId) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !userData?._id) return;

      Alert.alert(
        "Remove Friend",
        "Are you sure you want to remove this friend?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Remove",
            onPress: async () => {
              const response = await axios.post(
                `${BACKEND_URL}/deleteFriend`,
                {
                  userId: userData._id,
                  friendId,
                },
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              );

              // Refresh friends list
              const updatedUser = await axios.post(`${BACKEND_URL}/userData`, {
                token,
              });
              setUserData(updatedUser.data.data);
              fetchFriends(updatedUser.data.data.friends);

              Alert.alert("Success", response.data.message);
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error deleting friend:", error);
      Alert.alert("Error", "Failed to remove friend");
    }
  };

  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        try {
          const token = await AsyncStorage.getItem("token");
          if (!token) throw new Error("No token found");

          const res = await axios.post(`${BACKEND_URL}/userData`, { token });
          const freshUserData = res.data.data;

          setUserData(freshUserData);
          if (freshUserData.friends?.length > 0) {
            fetchFriends(freshUserData.friends);
          }
          fetchPendingRequests();

          // Calculate total units
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

  async function refetch() {
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
      return freshUserData;
    } catch (err) {
      setError("Failed to fetch user data.");
    } finally {
      setIsLoading(false);
    }
  }

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
      return freshUserData;
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
        <View style={styles.container}>
          <View style={styles.timetableIconWrapper}>
            <Pressable onPress={() => setSelfModalVisible(true)}>
              <Ionicons name="calendar" size={28} color="#AE96C7" />
            </Pressable>
          </View>
          <Modal
            visible={selfModalVisible}
            transparent={true}
            animationType="slide"
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                {userData.timetable ? (
                  <Image
                    source={{
                      uri: `data:image/png;base64,${userData.timetable}`,
                    }}
                    style={styles.timetableImage}
                  />
                ) : (
                  <Text style={styles.noTimetableText}>No timetable saved</Text>
                )}
                <Pressable
                  style={styles.closeButton}
                  onPress={() => setSelfModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </Pressable>
              </View>
            </View>
          </Modal>

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
          <View style={styles.mainContainer}>
            <View style={styles.tabContainer}>
              <Pressable
                style={[
                  styles.tabButton,
                  currentTab === "profile" && styles.activeTab,
                ]}
                onPress={() => setCurrentTab("profile")}
              >
                <Text style={styles.tabText}>Profile</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.tabButton,
                  currentTab === "friends" && styles.activeTab,
                ]}
                onPress={() => setCurrentTab("friends")}
              >
                <Text style={styles.tabText}>Friends</Text>
              </Pressable>
            </View>
            <View style={styles.dashboardContainer}>
              {currentTab === "profile" ? (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                  <View style={styles.infoCard}>
                    <View style={styles.cardHeader}>
                      <Pressable
                        testID="edit-profile-button"
                        onPress={() => setIsEditing(!isEditing)}
                      >
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
                        <Text style={styles.infoValue}>
                          {userData.semester}
                        </Text>
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
                          testID="mc-input"
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
                        testID="save-button"
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
              ) : (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                  <View style={styles.infoCard}>
                    <Pressable
                      onPress={() => setShowFriends(!showFriends)}
                      style={styles.sectionHeader}
                    >
                      <View style={styles.sectionHeaderContent}>
                        <Ionicons name="people" size={22} color="#AE96C7" />
                        <Text style={styles.sectionTitle}>Friends</Text>
                      </View>
                      <Ionicons
                        name={showFriends ? "chevron-up" : "chevron-down"}
                        size={22}
                        color="#AE96C7"
                      />
                    </Pressable>
                    {showFriends && (
                      <View style={styles.friendsListContainer}>
                        {friends.length > 0 ? (
                          friends.map((friend) => (
                            <Pressable
                              key={friend._id}
                              style={styles.friendListItem}
                              onPress={() => {
                                setSelectedFriend(friend);
                                setModalVisible(true);
                              }}
                            >
                              <View style={styles.friendInfo}>
                                {friend.profilePic ? (
                                  <Image
                                    source={{
                                      uri: `data:image/jpeg;base64,${friend.profilePic}`,
                                    }}
                                    style={styles.friendListItemImage}
                                  />
                                ) : (
                                  <View
                                    style={styles.friendListItemPlaceholder}
                                  >
                                    <Ionicons
                                      name="person"
                                      size={24}
                                      color="#AE96C7"
                                    />
                                  </View>
                                )}
                                <Text style={styles.friendListItemName}>
                                  {friend.name}
                                </Text>
                              </View>
                              <Pressable
                                testID="remove-friend-button"
                                onPress={() => handleDeleteFriend(friend._id)}
                                style={styles.deleteButton}
                              >
                                <Ionicons
                                  name="trash"
                                  size={20}
                                  color="#F44336"
                                />
                              </Pressable>
                            </Pressable>
                          ))
                        ) : (
                          <Text style={styles.noItemsText}>No friends yet</Text>
                        )}
                      </View>
                    )}

                    {/* Divider */}
                    <View style={styles.divider} />
                    <Pressable
                      onPress={() => setShowRequests(!showRequests)}
                      style={styles.sectionHeader}
                    >
                      <View style={styles.sectionHeaderContent}>
                        <Ionicons name="time" size={22} color="#AE96C7" />
                        <Text style={styles.sectionTitle}>
                          Pending Requests
                        </Text>
                      </View>
                      <Ionicons
                        name={showRequests ? "chevron-up" : "chevron-down"}
                        size={22}
                        color="#AE96C7"
                      />
                    </Pressable>
                    {showRequests && (
                      <View style={styles.requestsListContainer}>
                        {pendingRequests.length > 0 ? (
                          pendingRequests.map((request) => (
                            <View
                              key={request._id}
                              style={styles.requestListItem}
                            >
                              <View style={styles.friendInfo}>
                                {request.from.profilePic ? (
                                  <Image
                                    source={{
                                      uri: `data:image/jpeg;base64,${request.from.profilePic}`,
                                    }}
                                    style={styles.friendListItemImage}
                                  />
                                ) : (
                                  <View
                                    style={styles.friendListItemPlaceholder}
                                  >
                                    <Ionicons
                                      name="person"
                                      size={24}
                                      color="#AE96C7"
                                    />
                                  </View>
                                )}
                                <Text style={styles.friendListItemName}>
                                  {request.from.name}
                                </Text>
                              </View>
                              <View style={styles.requestActions}>
                                <Pressable
                                  style={styles.acceptButton}
                                  onPress={() =>
                                    handleFriendRequest(request._id, "accept")
                                  }
                                >
                                  <Ionicons
                                    name="checkmark"
                                    size={20}
                                    color="white"
                                  />
                                </Pressable>
                                <Pressable
                                  style={styles.rejectButton}
                                  onPress={() =>
                                    handleFriendRequest(request._id, "reject")
                                  }
                                >
                                  <Ionicons
                                    name="close"
                                    size={20}
                                    color="white"
                                  />
                                </Pressable>
                              </View>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.noItemsText}>
                            No pending requests
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                  <Modal
                    visible={showAddFriendModal}
                    transparent
                    animationType="slide"
                  >
                    <View style={styles.modalBox}>
                      <View style={styles.modal}>
                        <Text style={styles.modalHead}>Add Friend</Text>
                        <TextInput
                          style={styles.content}
                          placeholder="Enter your friend's email"
                          value={emailInput}
                          onChangeText={setEmailInput}
                          testID="email-input"
                          placeholderTextColor="#888"
                        />
                        <View style={styles.buttonRow}>
                          <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setShowAddFriendModal(false)}
                          >
                            <Text style={styles.buttonText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.sendButton}
                            onPress={() => {
                              sendFriendRequest(emailInput);
                              setShowAddFriendModal(false);
                            }}
                          >
                            <Text style={styles.buttonText}>Send</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </Modal>

                  <Pressable
                    testID="add-friend-button"
                    style={styles.addFriendButton}
                    onPress={() => setShowAddFriendModal(true)}
                  >
                    <Ionicons name="person-add" size={20} color="white" />
                    <Text style={styles.addFriendText}>Add Friend</Text>
                  </Pressable>
                </ScrollView>
              )}
            </View>
          </View>
          <Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                {selectedFriend && (
                  <>
                    <Text style={styles.modalTitle}>
                      {selectedFriend.name}'s Timetable
                    </Text>
                    {selectedFriend.timetable ? (
                      <Image
                        source={{
                          uri: `data:image/png;base64,${selectedFriend.timetable}`,
                        }}
                        style={styles.timetableImage}
                      />
                    ) : (
                      <Text style={styles.noTimetableText}>
                        No timetable saved
                      </Text>
                    )}
                  </>
                )}
                <Pressable
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        </View>
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
    paddingTop: 5,
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
    marginBottom: 15,
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
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    margin: 0,
    width: "100%",
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    width: "100%",
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: "#AE96C7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 10,
  },
  requestActions: {
    flexDirection: "row",
  },
  acceptButton: {
    backgroundColor: "#4CAF50",
    padding: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  rejectButton: {
    backgroundColor: "#F44336",
    padding: 8,
    borderRadius: 20,
  },
  noItemsText: {
    textAlign: "center",
    color: "#888",
    marginVertical: 20,
  },
  addFriendButton: {
    flexDirection: "row",
    backgroundColor: "#AE96C7",
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: 20,
  },
  addFriendText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  mainContainer: {
    flex: 1,
    width: "100%",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  tabButton: {
    padding: 5,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#AE96C7",
  },
  tabText: {
    fontSize: 16,
    color: "#333",
  },
  activeTabText: {
    color: "#AE96C7",
    fontWeight: "bold",
  },
  dashboardContainer: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: "90%",
    maxHeight: "80%",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  noTimetableText: {
    fontSize: 14,
    textAlign: "center",
  },
  timetableImage: {
    width: "95%",
    height: "80%",
    resizeMode: "contain",
    borderRadius: 8,
  },
  closeButton: {
    backgroundColor: "#AE96C7",
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
    width: "95%",
  },
  closeButtonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
  sectionHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  friendsListContainer: {
    marginTop: 5,
    marginBottom: 10,
  },
  friendListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EBE9E3",
  },
  friendInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  friendListItemImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  friendListItemPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F2F8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  friendListItemName: {
    fontSize: 15,
    color: "#555",
    fontWeight: "500",
    flexShrink: 1,
    flexWrap: "wrap",
  },
  requestsListContainer: {
    marginTop: 5,
    marginBottom: 10,
  },
  requestListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EBE9E3",
  },
  deleteButton: {
    padding: 8,
    marginLeft: 10,
  },
  timetableIconWrapper: {
    position: "absolute",
    top: 35,
    right: 10,
    zIndex: 10,
    backgroundColor: "white",
    padding: 5,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  modal: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  modalHead: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  content: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 20,
    color: "#000",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sendButton: {
    backgroundColor: "#AE96C7",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: "#ccc",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
