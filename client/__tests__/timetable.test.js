jest.mock("react-native-gesture-handler", () => {
  const View = require("react-native").View;
  return {
    __esModule: true,
    ...jest.requireActual("react-native-gesture-handler"),
    GestureHandlerRootView: View,
  };
});

import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import Timetable from "../app/(dashboard)/timetable.jsx";
import axios from "axios";

// Mock all dependencies
jest.mock("react-native-vector-icons/FontAwesome", () => "Icon");
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));
jest.mock("axios");
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve("mock-token")),
}));

describe("Timetable Component", () => {
  const mockUserDataWithoutTimetable = {
    semester: 1,
    modules: [
      { code: "CS1101S", completed: true, grade: "A" },
      { code: "MA1521", completed: true, grade: "B" },
    ],
    timetableLessons: null, // No saved timetable
    selectedMods: [],
  };

  const mockUserDataWithTimetable = {
    semester: 1,
    modules: [
      { code: "CS1101S", completed: true, grade: "A" },
      { code: "MA1521", completed: true, grade: "B" },
    ],
    timetableLessons: [
      {
        moduleCode: "CS2030S",
        lessonType: "Lecture",
        day: "Monday",
        startTime: "1000",
        endTime: "1200",
        venue: "LT1",
        weeks: [1, 2, 3, 4],
      },
    ],
    selectedMods: [{ moduleCode: "CS2030S" }],
  };

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

  const waitForLoading = async (queryByText) => {
    await waitFor(() => {
      expect(queryByText("Loading...")).toBeNull();
    });
  };

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
    expect(getByText("CS2030S")).toBeTruthy();
  });

  it("renders exam component for selected modules", async () => {
    const { getByPlaceholderText, findByText, getByText, queryByText } = render(
      <Timetable />
    );

    await waitFor(() => expect(queryByText("Loading...")).toBeNull(), {
      timeout: 5000,
    });

    const searchInput = getByPlaceholderText("Search module code or name");

    await act(async () => {
      fireEvent.changeText(searchInput, "CS2030S");
      await new Promise((r) => setTimeout(r, 100));
    });

    const moduleItem = await findByText("CS2030S");
    await act(async () => {
      fireEvent.press(moduleItem);
    });

    axios.get.mockImplementation((url) => {
      if (url.includes("CS2030S")) {
        return Promise.resolve({
          data: {
            moduleCredit: 4,
            semesterData: [
              {
                semester: 1,
                examDate: "2025-11-25T09:00:00.000Z",
                timetable: [],
              },
            ],
          },
        });
      }
      return Promise.reject(new Error("Module not found"));
    });

    await waitFor(() => {
      expect(getByText(/CS2030S/)).toBeTruthy();
    });

    expect(getByText(/Exam/i)).toBeTruthy();
  });

  it("should generate timetable with selected modules", async () => {
    const { getByPlaceholderText, findByText, getByText, queryByText } = render(
      <Timetable />
    );

    await waitFor(() => expect(queryByText("Loading...")).toBeNull(), {
      timeout: 5000,
    });

    const searchInput = getByPlaceholderText("Search module code or name");
    await act(async () => {
      fireEvent.changeText(searchInput, "CS2030S");
    });

    const moduleItem = await findByText("CS2030S");
    await act(async () => {
      fireEvent.press(moduleItem);
    });

    axios.post.mockResolvedValueOnce({
      data: {
        data: [
          {
            moduleCode: "CS2030S",
            lessonType: "Lecture",
            day: "Monday",
            startTime: "1000",
            endTime: "1200",
            venue: "LT1",
            weeks: [1, 2, 3, 4],
          },
        ],
      },
    });

    await act(async () => {
      fireEvent.press(getByText("Generate Timetable"));
    });

    await waitFor(
      () => {
        expect(getByText("Mon")).toBeTruthy();
        expect(getByText("CS2030S")).toBeTruthy();
        expect(getByText("Lecture")).toBeTruthy();
      },
      { timeout: 5000 }
    );
  });

  it("renders preference texts", async () => {
    const { getByText, queryByText } = render(<Timetable />);

    await waitFor(() => expect(queryByText("Loading...")).toBeNull(), {
      timeout: 5000,
    });

    expect(getByText("No classes on Monday")).toBeTruthy();
    expect(getByText("No classes on Tuesday")).toBeTruthy();
    expect(getByText("No classes on Wednesday")).toBeTruthy();
    expect(getByText("No classes on Thursday")).toBeTruthy();
    expect(getByText("No classes on Friday")).toBeTruthy();
    expect(getByText("Prefer classes ending before 2pm")).toBeTruthy();
    expect(getByText("Prefer classes starting after 10am")).toBeTruthy();
  });

  it("should load saved timetable when available", async () => {
    axios.post.mockReset();
    axios.post.mockResolvedValueOnce({
      data: {
        data: mockUserDataWithTimetable,
      },
    });

    axios.get.mockImplementation((url) => {
      if (url.includes("CS2030S")) {
        return Promise.resolve({
          data: {
            moduleCredit: 4,
            semesterData: [
              {
                semester: 1,
                timetable: [
                  {
                    lessonType: "Lecture",
                    day: "Monday",
                    startTime: "1000",
                    endTime: "1200",
                    venue: "LT1",
                    weeks: [1, 2, 3, 4],
                  },
                  {
                    lessonType: "Tutorial",
                    day: "Wednesday",
                    startTime: "1400",
                    endTime: "1500",
                    venue: "TR1",
                    weeks: [1, 2, 3, 4],
                  },
                ],
                examDate: "2025-11-25T09:00:00.000Z",
              },
            ],
          },
        });
      }
      return Promise.reject(new Error("Module not found"));
    });

    const { getByText, queryByText } = render(<Timetable />);

    await waitFor(() => expect(queryByText("Loading...")).toBeNull(), {
      timeout: 5000,
    });

    await act(async () => {
      fireEvent.press(getByText("Last Saved Timetable"));
    });

    await waitFor(
      () => {
        expect(getByText("Mon")).toBeTruthy();
        expect(getByText("CS2030S")).toBeTruthy();
        expect(getByText("Lecture")).toBeTruthy();
      },
      { timeout: 5000 }
    );
  });
});
