import { StyleSheet, Text, View } from "react-native";
import React from "react";

const Timetable = () => {
  return (
    <View style={styles.container}>
      <Text>timetable</Text>
    </View>
  );
};

export default Timetable;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EBE9E3",
    paddingHorizontal: 30,
    justifyContent: "center",
    alignItems: "center",
  },
});
