import React from "react";
import { TouchableOpacity, Text } from "react-native";
import styles from "./styles";

const PromptButton = ({ item }) => {
  return (
    <TouchableOpacity style={styles.promptButton} onPress={item.action}>
      <Text style={styles.promptText}>{item.text}</Text>
    </TouchableOpacity>
  );
};

export default PromptButton;
