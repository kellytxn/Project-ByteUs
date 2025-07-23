import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import Timetable from "../app/(dashboard)/timetable.jsx";
import axios from "axios";

// Mock all dependencies
jest.mock("react-native-gesture-handler", () => {
  const View = require("react-native").View;
  return {
    __esModule: true,
    ...jest.requireActual("react-native-gesture-handler"),
    GestureHandlerRootView: View,
  };
});
jest.mock("react-native-vector-icons/FontAwesome", () => "Icon");
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve("mock-token")),
}));
jest.mock("axios");

describe("timetable", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    axios.post.mockResolvedValueOnce({
      data: {
        data: {
          semester: 1,
          modules: [
            { code: "CS1101S", completed: true, grade: "A" },
            { code: "MA1521", completed: true, grade: "B" },
          ],
        },
      },
    });

    axios.get.mockResolvedValueOnce({
      data: [
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
      ],
    });

    axios.get.mockImplementation((url) => {
      if (url.includes("CS2030S")) {
        return Promise.resolve({
          data: {
            moduleCredit: 4,
            semesterData: [
              {
                semester: 1,
                timetable: [],
              },
            ],
          },
        });
      }
      return Promise.reject(new Error("Module not found"));
    });
  });

  const waitForLoadingToFinish = async (queryByText) => {
    await waitFor(() => {
      expect(queryByText("Loading...")).toBeNull();
    });
  };

  it("searches and selects a module, displaying module info", async () => {
    const { getByPlaceholderText, findByText, getByText, queryByText } = render(
      <Timetable />
    );

    await waitFor(
      () => {
        expect(queryByText("Loading...")).toBeNull();
      },
      { timeout: 15000 }
    );

    const searchInput = getByPlaceholderText("Search module code or name");
    await act(async () => {
      fireEvent.changeText(searchInput, "CS2");
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const moduleItem = await findByText("CS2030S");
    await act(async () => {
      fireEvent.press(moduleItem);
    });

    expect(getByText("Module Credits: 4")).toBeTruthy();
    expect(getByText("CS2030S")).toBeTruthy();
  });

  it("generates timetable after selecting modules", async () => {
    const { getByPlaceholderText, findByText, getByText, queryByText } = render(
      <Timetable />
    );

    await waitFor(
      () => {
        expect(queryByText("Loading...")).toBeNull();
      },
      { timeout: 15000 }
    );

    const searchInput = getByPlaceholderText("Search module code or name");
    await act(async () => {
      fireEvent.changeText(searchInput, "CS2030S");
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const moduleItem = await findByText("CS2030S");
    await act(async () => {
      fireEvent.press(moduleItem);
    });

    axios.post.mockResolvedValueOnce({
      data: {
        data: [
          {
            modCode: "CS2030S",
            lessonType: "Lecture",
            day: "Monday",
            startTime: "1000",
            endTime: "1200",
            venue: "LT1",
          },
        ],
      },
    });

    await act(async () => {
      fireEvent.press(getByText("Generate Timetable"));
    });

    await waitFor(() => {
      expect(getByText("Mon")).toBeTruthy();
      expect(getByText("CS2030S")).toBeTruthy();
    });
  });
});
