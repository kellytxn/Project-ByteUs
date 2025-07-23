import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import Login from "../app/(auth)/login";

// Mock all dependencies
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  Link: ({ children }) => children,
}));

jest.mock("axios", () => ({
  post: jest.fn(() =>
    Promise.resolve({ data: { status: "ok", data: "mock-token" } })
  ),
}));

describe("login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    require("axios").post.mockImplementation(() =>
      Promise.resolve({ data: { status: "ok", data: "mock-token" } })
    );
  });

  describe("ui rendering", () => {
    it("renders email and password fields", () => {
      const { getByPlaceholderText } = render(<Login />);
      expect(getByPlaceholderText("Email")).toBeTruthy();
      expect(getByPlaceholderText("Password")).toBeTruthy();
    });

    it("renders login button", () => {
      const { getByText } = render(<Login />);
      expect(getByText("Login")).toBeTruthy();
    });
  });

  describe("form interaction", () => {
    it("updates email field value", () => {
      const { getByPlaceholderText } = render(<Login />);
      const emailInput = getByPlaceholderText("Email");
      fireEvent.changeText(emailInput, "test@example.com");
      expect(emailInput.props.value).toBe("test@example.com");
    });

    it("updates password field value", () => {
      const { getByPlaceholderText } = render(<Login />);
      const passwordInput = getByPlaceholderText("Password");
      fireEvent.changeText(passwordInput, "mypassword");
      expect(passwordInput.props.value).toBe("mypassword");
    });
  });

  describe("edge cases", () => {
    it("handles network errors gracefully", async () => {
      require("axios").post.mockRejectedValueOnce(new Error("Network Error"));

      const { getByPlaceholderText, getByText, findByText } = render(<Login />);

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText("Email"), "test@example.com");
        fireEvent.changeText(getByPlaceholderText("Password"), "password");
        fireEvent.press(getByText("Login"));
      });

      const errorMessage = await findByText("Network Error");
      expect(errorMessage).toBeTruthy();
    });

    it("handles invalid login", async () => {
      require("axios").post.mockResolvedValueOnce({
        data: { unexpected: "format" },
      });

      const { getByPlaceholderText, getByText, findByText } = render(<Login />);

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText("Email"), "test@example.com");
        fireEvent.changeText(getByPlaceholderText("Password"), "password");
        fireEvent.press(getByText("Login"));
      });

      const errorMessage = await findByText("Invalid email or password");
      expect(errorMessage).toBeTruthy();
    });
  });
});
