import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import Home from "../app/index";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock dependencies
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
}));
const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
  Link: ({ children, href }) => <>{children}</>,
}));

jest.spyOn(console, "log").mockImplementation(() => {});
jest.spyOn(console, "error").mockImplementation(() => {});

describe("landing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
  });

  describe("loading", () => {
    it("displays loading indicator while checking auth status", () => {
      AsyncStorage.getItem.mockReturnValue(new Promise(() => {}));

      const { getByText } = render(<Home />);
      expect(getByText("Loading...")).toBeTruthy();
    });
  });

  describe("unauthenticated state", () => {
    it("shows login and register buttons when no token exists", async () => {
      const { getByText, queryByText } = render(<Home />);

      await waitFor(() => {
        expect(queryByText("Loading...")).toBeNull();
        expect(getByText("Login")).toBeTruthy();
        expect(getByText("Register")).toBeTruthy();
      });
    });

    it("navigates to login when login button pressed", async () => {
      const { getByText } = render(<Home />);

      await waitFor(() => {
        fireEvent.press(getByText("Login"));
      });

      expect(mockPush).toHaveBeenCalledWith("/login");
    });

    it("navigates to register when register button pressed", async () => {
      const { getByText } = render(<Home />);

      await waitFor(() => {
        fireEvent.press(getByText("Register"));
      });

      expect(mockPush).toHaveBeenCalledWith("/register");
    });
  });

  describe("authenticated state", () => {
    it("redirects to home screen when token exists", async () => {
      AsyncStorage.getItem.mockResolvedValue("valid-token");

      render(<Home />);

      await waitFor(() => {
        expect(AsyncStorage.getItem).toHaveBeenCalledWith("token");
        expect(mockReplace).toHaveBeenCalledWith("/home");
      });
    });

    it("handles AsyncStorage error gracefully", async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error("Storage error"));

      const { getByText } = render(<Home />);

      await waitFor(() => {
        expect(getByText("Login")).toBeTruthy();
      });
    });
  });
});
