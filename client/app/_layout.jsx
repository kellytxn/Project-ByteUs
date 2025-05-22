import { StyleSheet, View } from "react-native";
import React from "react";
import { Stack } from "expo-router";

const RootLayout = () => {
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#7B7878" },
          headerTitle: "",
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        ></Stack.Screen>

        <Stack.Screen name="(dashboard)" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
};

export default RootLayout;

const styles = StyleSheet.create({});
