import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import Track from "../app/(dashboard)/track.jsx";
import axios from "axios";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn((key) => {
    if (key === "token") {
      return Promise.resolve("mock-token");
    }
    return Promise.resolve(null);
  }),
  setItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve(null)),
  clear: jest.fn(() => Promise.resolve(null)),
  getAllKeys: jest.fn(() => Promise.resolve([])),
}));

// Mock axios
jest.mock("axios");

const renderWithNavigation = (ui) => {
  return render(<NavigationContainer>{ui}</NavigationContainer>);
};

describe("Track Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading indicator initially", () => {
    axios.post.mockReturnValue(new Promise(() => {}));
    const { getByTestId } = renderWithNavigation(<Track />);
    expect(getByTestId("activity-indicator")).toBeTruthy();
  });

  it("fetches and displays categories", async () => {
    axios.post.mockResolvedValue({
      data: {
        status: "ok",
        data: [
          {
            code: "CS1101S",
            name: "Programming Methodology",
            category: "Core",
          },
          {
            code: "MA1521",
            name: "Linear Algebra",
            category: "Math and Science",
          },
        ],
      },
    });

    const { findByText } = renderWithNavigation(<Track />);
    expect(await findByText("Core")).toBeTruthy();
    expect(await findByText("Math and Science")).toBeTruthy();
  });

  it("handles fetch failure gracefully", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    axios.post.mockResolvedValue({ data: { success: false, data: "fail" } });

    renderWithNavigation(<Track />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to fetch modules:",
        "fail"
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("handles network error gracefully", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    axios.post.mockRejectedValue(new Error("Network Error"));

    renderWithNavigation(<Track />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error fetching modules:",
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });
});
