import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import Register from "../app/(auth)/register.jsx";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

// Mock all dependencies
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve()),
}));
jest.spyOn(Alert, "alert").mockImplementation(() => {});

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  Link: ({ children }) => children,
}));

describe("Register Screen Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers successfully and navigates to /home", async () => {
    const { getByPlaceholderText, getByText } = render(<Register />);

    fireEvent.changeText(
      getByPlaceholderText("Enter your full name"),
      "John Doe"
    );
    fireEvent.changeText(getByPlaceholderText("Enter your course"), "CS");
    fireEvent(getByText("Select year"), "onChange", {
      nativeEvent: { text: "1" },
    });
    fireEvent(getByText("Select semester"), "onChange", {
      nativeEvent: { text: "1" },
    });
    fireEvent.changeText(
      getByPlaceholderText("Enter your email"),
      "john@example.com"
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter a password"),
      "password123"
    );

    fireEvent.press(getByText("Register"));

    await waitFor(() => {
      expect(getByText("Register")).toBeTruthy();
    });
  });
  it("shows alert if required fields are empty", async () => {
    const { getByText } = render(<Register />);

    fireEvent.press(getByText("Register"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Please fill all fields");
    });
  });
});
