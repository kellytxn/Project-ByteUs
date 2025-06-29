import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import Home from "../app/(dashboard)/home.jsx";
import * as axios from "axios";

// Mock routing
jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
}));

// Mock storage and axios
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve("mock-token")),
  removeItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock("axios");

describe("Home Component", () => {
  it('displays "Welcome back," and user name', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        data: {
          name: "Kelly",
          course: "CS",
          year: 1,
          semester: 1,
          email: "kelly@example.com",
        },
      },
    });

    const { getByText } = render(<Home />);

    await waitFor(() => {
      expect(getByText("Welcome back,")).toBeTruthy();
      expect(getByText("Kelly")).toBeTruthy();
    });
  });
});
