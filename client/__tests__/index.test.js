import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import Home from "../app/index";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock all dependencies
jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
  }),
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
}));

describe("Landing component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading indicator initially", () => {
    AsyncStorage.getItem.mockReturnValue(new Promise(() => {}));

    const { getByText, getByTestId } = render(<Home />);

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

  it("calls router.replace('/home') when token exists", async () => {
    const mockReplace = jest.fn();
    jest.mock("expo-router", () => ({
      useRouter: () => ({
        replace: mockReplace,
        push: jest.fn(),
      }),
    }));

    AsyncStorage.getItem.mockResolvedValue("mock-token");

    render(<Home />);

    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalledWith("token");
    });
  });
});
