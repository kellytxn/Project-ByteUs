import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import Home from "../app/(dashboard)/home";
import { NavigationContainer } from "@react-navigation/native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock all dependencies
jest.mock("axios");
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
}));

describe("home", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === "token") return Promise.resolve("mock-token");
      return Promise.resolve(null);
    });
  });

  it('displays "Welcome back," and user name when data loads successfully', async () => {
    axios.post.mockImplementation((url) => {
      if (url.includes("/userData")) {
        return Promise.resolve({
          data: {
            data: {
              name: "Kelly",
              course: "CS",
              year: 1,
              semester: 1,
              email: "kelly@example.com",
              modules: [],
            },
          },
        });
      }
      return Promise.reject(new Error("Unexpected API call"));
    });

    const { getByText, queryByText } = render(
      <NavigationContainer>
        <Home />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText("Welcome back,")).toBeTruthy();
      expect(getByText("Kelly")).toBeTruthy();
    });

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/userData"),
      { token: "mock-token" }
    );
  });

  it("displays error message when API call fails", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    axios.post.mockRejectedValue(new Error("Network error"));

    const { getByText, queryByText } = render(
      <NavigationContainer>
        <Home />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(queryByText("Welcome back,")).toBeNull();
      expect(queryByText("Kelly")).toBeNull();
      expect(getByText("Failed to fetch user data.")).toBeTruthy();
    });

    consoleErrorSpy.mockRestore();
  });
});
