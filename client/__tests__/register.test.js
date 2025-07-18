import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import Register from "../app/(auth)/register.jsx";
import { Alert } from "react-native";

// Mock all dependencies
jest.mock("axios");
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve()),
}));

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  Link: ({ children }) => children,
}));

jest.spyOn(Alert, "alert");

describe("Register Screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
