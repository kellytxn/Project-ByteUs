import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
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

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

// Mock console.error to clean up test output
const consoleErrorSpy = jest
  .spyOn(console, "error")
  .mockImplementation(() => {});

describe("Home Component - Unit Tests", () => {
  const mockUserData = {
    name: "Kelly",
    course: "CS",
    year: 1,
    semester: 1,
    email: "kelly@example.com",
    modules: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue("mock-token");
    axios.post.mockResolvedValue({
      data: { data: mockUserData },
    });
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  const renderComponent = () => {
    return render(
      <NavigationContainer>
        <Home />
      </NavigationContainer>
    );
  };

  describe("Initial State", () => {
    it("fetches token from AsyncStorage on mount", async () => {
      renderComponent();
      await waitFor(() => {
        expect(AsyncStorage.getItem).toHaveBeenCalledWith("token");
      });
    });
  });

  describe("Successful Data Fetch", () => {
    it("displays welcome message with user name", async () => {
      const { getByText } = renderComponent();

      await waitFor(() => {
        expect(getByText("Welcome back,")).toBeTruthy();
        expect(getByText("Kelly")).toBeTruthy();
      });
    });

    it("makes correct API call with token", async () => {
      renderComponent();

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining("/userData"),
          { token: "mock-token" }
        );
      });
    });
  });

  describe("Error Handling", () => {
    it("handles missing token scenario", async () => {
      AsyncStorage.getItem.mockResolvedValueOnce(null);
      const { queryByText } = renderComponent();

      await waitFor(() => {
        expect(queryByText("Welcome back,")).toBeNull();
      });
    });
  });
});
