import { StyleSheet, Text, View, Pressable } from "react-native";
import React from "react";
import { useUser } from "../../hooks/useUser";

const Home = () => {
  const { logout, user } = useUser();
  return (
    <View style={styles.container}>
      <Text>{user.email}</Text>
      <Text>profile</Text>
      <Pressable
        onPress={logout}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>Logout</Text>
      </Pressable>
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
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});
