import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import Register from "../app/(auth)/register.jsx";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

// Mock axios
jest.mock("axios");

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve()),
}));

// Mock expo-router's useRouter
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  Link: ({ children }) => children,
}));

// Mock Alert to spy on alert calls
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

    // Set invalid email
    fireEvent.changeText(
      getByPlaceholderText("Enter your email"),
      "invalid-email"
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter a password"),
      "password123"
    );

    fireEvent.press(getByText("Register"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Please enter a valid email address"
    );
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
    // Set short password
    fireEvent.changeText(getByPlaceholderText("Enter a password"), "short");

    fireEvent.press(getByText("Register"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Password must be at least 8 characters long"
    );
  });

  it("handles successful registration and login", async () => {
    // Mock API responses
    axios.post
      .mockResolvedValueOnce({ data: { status: "ok" } })
      .mockResolvedValueOnce({ data: { status: "ok", data: "mock-token" } });

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
    fireEvent.changeText(
      getByPlaceholderText("Enter a password"),
      "password123"
    );

    fireEvent.press(getByText("Register"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/register"),
        expect.objectContaining({
          name: "John Doe",
          course: "CS",
          year: "1",
          semester: "1",
          email: "john@example.com",
          password: "password123",
        })
      );
    });

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/login"),
        expect.objectContaining({
          email: "john@example.com",
          password: "password123",
        })
      );
    });

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith("token", "mock-token");
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/home");
    });
  });

  it("displays error message from API on registration failure", async () => {
    axios.post.mockResolvedValueOnce({
      data: { status: "error", data: "Email already used" },
    });

    const { getByPlaceholderText, getByText, findByText } = render(
      <Register />
    );

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
    fireEvent.changeText(
      getByPlaceholderText("Enter a password"),
      "password123"
    );

    fireEvent.press(getByText("Register"));

    const errorText = await findByText("Email already used");
    expect(errorText).toBeTruthy();
  });

  it("displays error message on login failure after registration", async () => {
    axios.post
      .mockResolvedValueOnce({ data: { status: "ok" } })
      .mockResolvedValueOnce({
        data: { status: "error", data: "Login failed" },
      });

    const { getByPlaceholderText, getByText, findByText } = render(
      <Register />
    );

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
    fireEvent.changeText(
      getByPlaceholderText("Enter a password"),
      "password123"
    );

    fireEvent.press(getByText("Register"));

    const errorText = await findByText("Login failed after registration");
    expect(errorText).toBeTruthy();
  });
});