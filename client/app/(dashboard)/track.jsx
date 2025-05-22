import { StyleSheet, Text, View, Pressable } from "react-native";
import React from "react";

const Track = () => {
  return <View style={styles.container}></View>;
};

export default Track;

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
