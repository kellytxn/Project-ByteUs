import React from "react";
import { TextInput, StyleSheet } from "react-native";

const CustomInput = ({ value, onChangeText, placeholder, secureTextEntry }) => (
  <TextInput
    style={styles.input}
    placeholder={placeholder}
    placeholderTextColor="#999"
    secureTextEntry={secureTextEntry}
    value={value}
    onChangeText={onChangeText}
  />
);

const styles = StyleSheet.create({
  input: {
    width: 300,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 16,
    borderColor: "#ccc",
    borderWidth: 1,
  },
});

export default CustomInput;
