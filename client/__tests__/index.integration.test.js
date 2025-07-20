import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import Home from "../app/index";
import AsyncStorage from "@react-native-async-storage/async-storage";

const mockReplace = jest.fn();

// Mock all dependencies
jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
  }),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
}));

describe("Home Screen Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading indicator initially", () => {
    AsyncStorage.getItem.mockReturnValue(new Promise(() => {}));

    const { getByText } = render(<Home />);

    expect(getByText("Loading...")).toBeTruthy();
  });

  it("shows Login and Register buttons when no token", async () => {
    AsyncStorage.getItem.mockResolvedValue(null);

    const { getByText, queryByText } = render(<Home />);

    await waitFor(() => {
      expect(queryByText("Loading...")).toBeNull();
      expect(getByText("Login")).toBeTruthy();
      expect(getByText("Register")).toBeTruthy();
    });
  });

  it("navigates to /home when token exists", async () => {
    AsyncStorage.getItem.mockResolvedValue("mock-token");

    render(<Home />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/home");
    });
  });
});
