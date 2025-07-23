import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import Home from "../app/(dashboard)/home";
import { NavigationContainer } from "@react-navigation/native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

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
jest.spyOn(Alert, "alert");

const consoleErrorSpy = jest
  .spyOn(console, "error")
  .mockImplementation(() => {});

describe("home", () => {
  const mockUserData = {
    name: "Kelly",
    course: "CS",
    year: 1,
    semester: 1,
    email: "kelly@example.com",
    modules: [],
    friends: ["friend1_id"], // Simulate friend IDs
  };

  const mockFriendsData = [
    {
      _id: "friend1_id",
      name: "Alice",
      profilePic: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue("mock-token");
    axios.post.mockImplementation((url) => {
      if (url.endsWith("/userData")) {
        return Promise.resolve({ data: { data: mockUserData } });
      }
      if (url.endsWith("/getFriendsDetails")) {
        return Promise.resolve({ data: { friends: mockFriendsData } });
      }
      return Promise.resolve({ data: {} });
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

  describe("initial state", () => {
    it("fetches token from AsyncStorage on mount", async () => {
      renderComponent();
      await waitFor(() => {
        expect(AsyncStorage.getItem).toHaveBeenCalledWith("token");
      });
    });
  });

  describe("successful data fetch", () => {
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

  describe("edge cases", () => {
    it("handles missing token scenario", async () => {
      AsyncStorage.getItem.mockResolvedValueOnce(null);
      const { queryByText } = renderComponent();

      await waitFor(() => {
        expect(queryByText("Welcome back,")).toBeNull();
      });
    });
  });

  describe("profile info display", () => {
    it("displays profile information", async () => {
      const { getByText, queryByText, getByTestId, getAllByText } =
        renderComponent();

      await waitFor(() => getByText("Welcome back,"));

      expect(getByText("Kelly")).toBeTruthy();

      expect(getByText("Course:")).toBeTruthy();
      expect(getByText("CS")).toBeTruthy();

      expect(getByText("Year:")).toBeTruthy();

      expect(getByText("Semester:")).toBeTruthy();

      const ones = getAllByText("1");
      expect(ones.length).toBeGreaterThanOrEqual(2);

      expect(getByText("MCs Required:")).toBeTruthy();
      expect(getByText("N/A")).toBeTruthy();
    });

    it("allows editing and saving profile", async () => {
      const { getByText, getByTestId, getByDisplayValue } = renderComponent();

      await waitFor(() => getByText("Welcome back,"));

      fireEvent.press(getByTestId("edit-profile-button"));

      const courseInput = getByDisplayValue("CS");
      fireEvent.changeText(courseInput, "New Course");

      fireEvent.press(getByTestId("save-button"));

      await waitFor(() => {
        expect(getByDisplayValue("New Course")).toBeTruthy();
      });
    });

    it("shows alert for non-numeric MCs", async () => {
      const { getByTestId, getByText, getByDisplayValue } = renderComponent();

      await waitFor(() => getByText("Welcome back,"));

      fireEvent.press(getByTestId("edit-profile-button"));

      const mcInput = getByTestId("mc-input");
      fireEvent.changeText(mcInput, "abc");

      fireEvent.press(getByTestId("save-button"));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          "Please enter a valid number for MCs to Graduate."
        );
      });
    });
  });

  describe("friends info display", () => {
    it("displays friends information", async () => {
      const { getByText, getAllByText } = renderComponent();

      await waitFor(() => getByText("Welcome back,"));

      const tabs = getAllByText("Friends");
      fireEvent.press(tabs[0]);

      await waitFor(() => {
        const friends = getAllByText("Friends");
        expect(friends.length).toBeGreaterThanOrEqual(2);
        expect(getByText("Pending Requests")).toBeTruthy();
      });
    });
  });
});
