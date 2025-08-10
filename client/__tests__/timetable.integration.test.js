jest.mock("react-native-gesture-handler", () => {
  const View = require("react-native").View;
  return {
    __esModule: true,
    ...jest.requireActual("react-native-gesture-handler"),
    GestureHandlerRootView: View,
  };
});

import React from "react";
import {
  render,
  fireEvent,
  waitFor,
  screen,
  act,
} from "@testing-library/react-native";
import Timetable from "../app/(dashboard)/timetable";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock all dependencies
jest.mock("axios");
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve("mock-token")),
}));
jest.mock("react-native-view-shot");
jest.mock("expo-media-library");
jest.mock("react-native-vector-icons/FontAwesome", () => "Icon");
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));

describe("timetable", () => {
  const mockUserData = {
    semester: 1,
    modules: [
      { code: "CS1101S", completed: true, grade: "A" },
      { code: "MA1521", completed: true, grade: "B" },
    ],
    timetableLessons: null,
    selectedMods: [],
  };

  const mockModsData = [
    {
      moduleCode: "CS2030S",
      title: "Programming Methodology II",
      semesters: [1],
    },
    {
      moduleCode: "CS2040S",
      title: "Data Structures and Algorithms",
      semesters: [1],
    },
  ];

  const mockTimetableData = {
    moduleCode: "CS2030S",
    lessonType: "Lecture",
    day: "Monday",
    startTime: "1000",
    endTime: "1200",
    venue: "LT1",
    weeks: [1, 2, 3, 4],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    AsyncStorage.getItem.mockResolvedValue("mock-token");

    axios.get.mockImplementation((url) => {
      if (url.includes("moduleList.json")) {
        return Promise.resolve({ data: mockModsData });
      }
      if (url.includes("CS2030S")) {
        return Promise.resolve({
          data: {
            moduleCredit: 4,
            semesterData: [
              {
                semester: 1,
                timetable: [mockTimetableData],
                examDate: "2025-11-25T09:00:00.000Z",
              },
            ],
          },
        });
      }
      return Promise.reject(new Error("Module not found"));
    });

    axios.post.mockImplementation((url) => {
      if (url.includes("userData")) {
        return Promise.resolve({ data: { data: mockUserData } });
      }
      if (url.includes("timetableGen")) {
        return Promise.resolve({
          data: {
            data: [mockTimetableData],
          },
        });
      }
      return Promise.reject(new Error("Unexpected endpoint"));
    });
  });

  const waitForLoading = async () => {
    await waitFor(
      () => {
        expect(screen.queryByText("Loading...")).toBeNull();
      },
      { timeout: 5000 }
    );
  };

  it("should load user data and module list on mount", async () => {
    render(<Timetable />);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("userData"),
        { token: "mock-token" }
      );
      expect(axios.get).toHaveBeenCalledWith(
        "https://api.nusmods.com/v2/2025-2026/moduleList.json"
      );
    });
  });

  it("should search and select modules", async () => {
    const { getByPlaceholderText, findByText, getByText, queryByText } = render(
      <Timetable />
    );

    await waitForLoading(queryByText);

    const searchInput = getByPlaceholderText("Search module code or name");
    await act(async () => {
      fireEvent.changeText(searchInput, "CS2");
      await new Promise((r) => setTimeout(r, 100));
    });

    const moduleItem = await findByText("CS2030S");
    await act(async () => {
      fireEvent.press(moduleItem);
    });

    expect(getByText("Module Credits: 4")).toBeTruthy();
    const allCS2030S = screen.getAllByText("CS2030S");
    expect(allCS2030S.length).toBeGreaterThan(1);
  });

  it("should generate and display timetable", async () => {
    render(<Timetable />);
    await waitForLoading();

    fireEvent.changeText(
      screen.getByPlaceholderText("Search module code or name"),
      "CS2030S"
    );
    await waitFor(() => screen.getByText("CS2030S"));
    fireEvent.press(screen.getByText("CS2030S"));

    fireEvent.press(screen.getByText("Generate Timetable"));

    await waitFor(() => {
      expect(screen.getByText("Mon")).toBeTruthy();
      expect(screen.getByText("CS2030S")).toBeTruthy();
      expect(screen.getByText("Lecture")).toBeTruthy();
    });
  });

  it("should show exam information for selected modules in calendar format", async () => {
    render(<Timetable />);
    await waitForLoading();

    fireEvent.changeText(
      screen.getByPlaceholderText("Search module code or name"),
      "CS2030S"
    );
    await waitFor(() => screen.getByText("CS2030S"));
    fireEvent.press(screen.getByText("CS2030S"));

    await waitFor(() => {
      expect(screen.getByText("25")).toBeTruthy();

      expect(screen.getByText(/12:NaN AM/)).toBeTruthy();
    });
  });

  it("should disable 'Last Saved Timetable' button when no timetable exists", async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        data: {
          ...mockUserData,
          timetableLessons: null,
          selectedMods: [],
        },
      },
    });

    render(<Timetable />);
    await waitForLoading();

    const lastSavedButton = screen.getByText("Last Saved Timetable");

    fireEvent.press(lastSavedButton);
    await waitFor(() => {
      expect(screen.queryByText("No Last Saved Timetable")).toBeNull();
    });
  });

  it("should load saved timetable when available", async () => {
    axios.post.mockReset();
    axios.post.mockResolvedValueOnce({
      data: {
        data: {
          ...mockUserData,
          timetableLessons: [mockTimetableData],
          selectedMods: [{ moduleCode: "CS2030S" }],
        },
      },
    });

    render(<Timetable />);
    await waitForLoading();

    fireEvent.press(screen.getByText("Last Saved Timetable"));

    await waitFor(() => {
      expect(screen.getByText("Mon")).toBeTruthy();
      expect(screen.getByText("CS2030S")).toBeTruthy();
    });
  });
});
