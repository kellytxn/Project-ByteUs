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
jest.mock("axios");

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import Login from "../app/(auth)/login";
import axios from "axios";

describe("Login Screen", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    axios.post.mockReset();
  });

  it("renders correctly", () => {
    const { getByPlaceholderText, getByText } = render(<Login />);
    expect(getByPlaceholderText("Email")).toBeTruthy();
    expect(getByPlaceholderText("Password")).toBeTruthy();
    expect(getByText("Login")).toBeTruthy();
  });

  it("shows error on failed login", async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { data: "Invalid credentials" } },
    });

    const { getByPlaceholderText, getByText, findByText } = render(<Login />);
    fireEvent.changeText(getByPlaceholderText("Email"), "wrong@example.com");
    fireEvent.changeText(getByPlaceholderText("Password"), "wrongpass");
    fireEvent.press(getByText("Login"));

    const errorMessage = await findByText("Invalid credentials");
    expect(errorMessage).toBeTruthy();
  });

  it("navigates on successful login", async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        status: "ok",
        data: "mock-token",
      },
    });

    const { getByPlaceholderText, getByText } = render(<Login />);
    fireEvent.changeText(getByPlaceholderText("Email"), "test@example.com");
    fireEvent.changeText(getByPlaceholderText("Password"), "correctpass");
    fireEvent.press(getByText("Login"));

    // wait for router.replace to be called
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/home"));
  });
});
