import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import Register from "../app/(auth)/register.jsx";
import { Alert } from "react-native";

// Mock all dependencies
jest.mock("axios");
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve()),
}));
global.mockPush = jest.fn();
global.mockReplace = jest.fn();
jest.mock("expo-router", () => {
  const React = require("react");
  const { Pressable } = require("react-native");

  return {
    useRouter: () => ({
      push: global.mockPush,
      replace: global.mockReplace,
    }),
    Link: ({ children, href }) => (
      <Pressable onPress={() => global.mockPush(href)}>{children}</Pressable>
    ),
    __esModule: true,
  };
});

jest.spyOn(Alert, "alert");

describe("register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("ui rendering", () => {
    it("renders all input fields and buttons", () => {
      const { getByPlaceholderText, getByText } = render(<Register />);

      expect(getByPlaceholderText("Enter your full name")).toBeTruthy();
      expect(getByPlaceholderText("Enter your course")).toBeTruthy();
      expect(getByText("Select year")).toBeTruthy();
      expect(getByText("Select semester")).toBeTruthy();
      expect(getByPlaceholderText("Enter your email")).toBeTruthy();
      expect(getByPlaceholderText("Enter a password")).toBeTruthy();
      expect(getByText("Register")).toBeTruthy();
      expect(getByText("Already have an account? Login")).toBeTruthy();
    });
  });

  describe("form interaction", () => {
    it("updates full name field value", () => {
      const { getByPlaceholderText } = render(<Register />);
      const fullNameInput = getByPlaceholderText("Enter your full name");
      fireEvent.changeText(fullNameInput, "John Doe");
      expect(fullNameInput.props.value).toBe("John Doe");
    });

    it("updates course field value", () => {
      const { getByPlaceholderText } = render(<Register />);
      const courseInput = getByPlaceholderText("Enter your course");
      fireEvent.changeText(courseInput, "Computer Science");
      expect(courseInput.props.value).toBe("Computer Science");
    });

    it("updates email field value", () => {
      const { getByPlaceholderText } = render(<Register />);
      const emailInput = getByPlaceholderText("Enter your email");
      fireEvent.changeText(emailInput, "test@example.com");
      expect(emailInput.props.value).toBe("test@example.com");
    });

    it("updates password field value", () => {
      const { getByPlaceholderText } = render(<Register />);
      const passwordInput = getByPlaceholderText("Enter a password");
      fireEvent.changeText(passwordInput, "mypassword");
      expect(passwordInput.props.value).toBe("mypassword");
    });
  });

  describe("edge cases", () => {
    it("shows alert if required fields are empty", () => {
      const { getByText } = render(<Register />);

      fireEvent.press(getByText("Register"));
      expect(Alert.alert).toHaveBeenCalledWith("Please fill all fields");
    });

    it("shows alert if email is invalid", () => {
      const { getByPlaceholderText, getByText } = render(<Register />);

      fireEvent.changeText(
        getByPlaceholderText("Enter your full name"),
        "John Doe"
      );
      fireEvent.changeText(getByPlaceholderText("Enter your course"), "CS");
      fireEvent(getByText("Select year"), "onChange", { value: "1" });
      fireEvent(getByText("Select semester"), "onChange", { value: "1" });

      fireEvent.changeText(
        getByPlaceholderText("Enter your email"),
        "invalid-email"
      );
      fireEvent.changeText(
        getByPlaceholderText("Enter a password"),
        "password123"
      );

      fireEvent.press(getByText("Register"));

      expect(Alert.alert).toHaveBeenCalledWith("Invalid email address");
    });

    it("shows alert if password is too short", () => {
      const { getByPlaceholderText, getByText } = render(<Register />);

      fireEvent.changeText(
        getByPlaceholderText("Enter your full name"),
        "John Doe"
      );
      fireEvent.changeText(getByPlaceholderText("Enter your course"), "CS");
      fireEvent(getByText("Select year"), "onChange", { value: "1" });
      fireEvent(getByText("Select semester"), "onChange", { value: "1" });

      fireEvent.changeText(
        getByPlaceholderText("Enter your email"),
        "john@example.com"
      );
      fireEvent.changeText(getByPlaceholderText("Enter a password"), "short");

      fireEvent.press(getByText("Register"));

      expect(Alert.alert).toHaveBeenCalledWith(
        "Password must be at least 8 characters"
      );
    });
  });

  describe("navigation to login", () => {
    it("navigates to login when 'Already have an account? Login' is pressed", () => {
      const { getByText } = render(<Register />);

      fireEvent.press(getByText("Already have an account? Login"));

      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });
});
