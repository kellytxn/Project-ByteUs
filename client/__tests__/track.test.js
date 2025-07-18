import React from "react";
import { render, fireEvent, act, waitFor } from "@testing-library/react-native";
import Track from "../app/(dashboard)/track";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";

// Mock all dependencies
jest.mock("axios");
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
jest.mock("react-native-chart-kit", () => ({
  PieChart: () => null,
  LineChart: () => null,
}));
jest.mock("react-native-progress", () => ({
  Circle: () => null,
}));

beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  console.log.mockRestore();
  console.error.mockRestore();
});

const renderWithNavigation = (ui) =>
  render(<NavigationContainer>{ui}</NavigationContainer>);

describe("Track Component", () => {
  const mockUserData = {
    email: "test@example.com",
    name: "Test User",
  };

  const mockModules = [
    {
      _id: "1",
      $id: "1",
      code: "CS1010",
      name: "Programming Methodology",
      category: "Core",
      units: 4,
      completed: true,
      grade: "A",
      year: "1",
      semester: "1",
      isSU: false,
    },
    {
      _id: "2",
      $id: "2",
      code: "GESS1000",
      name: "General Education",
      category: "GE",
      units: 4,
      completed: false,
      grade: "",
      year: "",
      semester: "",
      isSU: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === "token") return Promise.resolve("test-token");
      if (key === "mcsToGraduate_test@example.com")
        return Promise.resolve("160");
      return Promise.resolve(null);
    });

    axios.post.mockImplementation((url) => {
      if (url.includes("/userData")) {
        return Promise.resolve({ data: { status: "ok", data: mockUserData } });
      }
      if (url.includes("/getModules")) {
        return Promise.resolve({ data: { status: "ok", data: mockModules } });
      }
      if (url.includes("/createModule")) {
        return Promise.resolve({ data: { status: "ok", id: "3" } });
      }
      if (url.includes("/updateModule")) {
        return Promise.resolve({ data: { status: "ok" } });
      }
      if (url.includes("/deleteModule")) {
        return Promise.resolve({ data: { status: "ok" } });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    axios.get.mockImplementation((url) => {
      if (url.includes("api.nusmods.com")) {
        return Promise.resolve({
          data: {
            moduleCode: "CS2030",
            title: "Programming Methodology II",
            moduleCredit: "4",
          },
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });
  });

  it("renders loading state initially", async () => {
    const { getByTestId } = renderWithNavigation(<Track />);
    await act(async () => {
      expect(getByTestId("activity-indicator")).toBeTruthy();
    });
  });

  it("toggles the module creation form", async () => {
    const { getByText, queryByPlaceholderText } = renderWithNavigation(
      <Track />
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const addButton = getByText("+");
    fireEvent.press(addButton);

    expect(getByText("-")).toBeTruthy();
    expect(queryByPlaceholderText("Enter module code")).toBeTruthy();

    fireEvent.press(getByText("-"));
    expect(queryByPlaceholderText("Enter module code")).toBeNull();
  });

  it("creates a new module", async () => {
    const { getByText, getByPlaceholderText } = renderWithNavigation(<Track />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    fireEvent.press(getByText("+"));

    fireEvent.changeText(getByPlaceholderText("Enter module code"), "CS2030");
    fireEvent.changeText(
      getByPlaceholderText("Enter module name"),
      "Programming Methodology II"
    );
    fireEvent.changeText(getByPlaceholderText("Enter category"), "Core");
    fireEvent.changeText(getByPlaceholderText("Enter the MCs"), "4");

    fireEvent.press(getByText("Create"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/createModule"),
        expect.objectContaining({
          token: "test-token",
          module: expect.objectContaining({
            code: "CS2030",
            name: "Programming Methodology II",
            category: "Core",
            units: 4,
            completed: false,
          }),
        })
      );
    });
  });

  it("auto-fills module details from NUSMods API", async () => {
    const { getByText, getByPlaceholderText } = renderWithNavigation(<Track />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    fireEvent.press(getByText("+"));

    const codeInput = getByPlaceholderText("Enter module code");
    fireEvent.changeText(codeInput, "CS2030");

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });

    expect(getByPlaceholderText("Enter module name").props.value).toBe(
      "Programming Methodology II"
    );
    expect(getByPlaceholderText("Enter the MCs").props.value).toBe("4");
  });

  it("toggles category expansion", async () => {
    const { getByText, queryByText } = renderWithNavigation(<Track />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const coreCategory = getByText("Core");
    fireEvent.press(coreCategory);

    expect(queryByText("Programming Methodology")).toBeTruthy();

    fireEvent.press(coreCategory);
    expect(queryByText("Programming Methodology")).toBeNull();
  });

  it("shows MCs progress", async () => {
    const { getByText } = renderWithNavigation(<Track />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(getByText("4/8 MCs")).toBeTruthy();
    expect(getByText("completed")).toBeTruthy();
  });
});
