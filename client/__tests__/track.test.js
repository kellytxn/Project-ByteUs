import React from "react";
import { render, fireEvent, act, waitFor } from "@testing-library/react-native";
import Track from "../app/(dashboard)/track";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { Alert } from "react-native";

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
jest.spyOn(Alert, "alert");

const renderWithNavigation = (ui) =>
  render(<NavigationContainer>{ui}</NavigationContainer>);

beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("track", () => {
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

  it("renders loading indicator initially", async () => {
    const { getByTestId } = renderWithNavigation(<Track />);

    await act(async () => {
      expect(getByTestId("activity-indicator")).toBeTruthy();
    });
  });

  it("shows module creation form when '+' pressed and hides on '-'", async () => {
    const { getByText, queryByPlaceholderText } = renderWithNavigation(
      <Track />
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    fireEvent.press(getByText("+"));
    expect(getByText("-")).toBeTruthy();

    expect(queryByPlaceholderText("Enter module code")).toBeTruthy();
    expect(queryByPlaceholderText("Enter module name")).toBeTruthy();
    expect(queryByPlaceholderText("Enter the MCs")).toBeTruthy();
    expect(queryByPlaceholderText("Enter category")).toBeTruthy();

    fireEvent.press(getByText("-"));

    expect(queryByPlaceholderText("Enter module code")).toBeNull();
    expect(queryByPlaceholderText("Enter module name")).toBeNull();
    expect(queryByPlaceholderText("Enter the MCs")).toBeNull();
    expect(queryByPlaceholderText("Enter catgeory")).toBeNull();
  });

  it("calls API to create a module when form submitted", async () => {
    const { getByText, getByPlaceholderText } = renderWithNavigation(<Track />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
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

  it("auto-fills module details on code input", async () => {
    const { getByText, getByPlaceholderText } = renderWithNavigation(<Track />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    fireEvent.press(getByText("+"));

    const codeInput = getByPlaceholderText("Enter module code");
    fireEvent.changeText(codeInput, "CS2030");

    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });

    expect(getByPlaceholderText("Enter module name").props.value).toBe(
      "Programming Methodology II"
    );
    expect(getByPlaceholderText("Enter the MCs").props.value).toBe("4");
  });

  it("toggles module category expansion", async () => {
    const { getByText, queryByText } = renderWithNavigation(<Track />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    fireEvent.press(getByText("Core"));
    expect(queryByText("Programming Methodology")).toBeTruthy();

    fireEvent.press(getByText("Core"));
    expect(queryByText("Programming Methodology")).toBeNull();
  });

  it("displays MCs progress correctly", async () => {
    const { getByText } = renderWithNavigation(<Track />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(getByText("4/8 MCs")).toBeTruthy();
    expect(getByText("completed")).toBeTruthy();
  });

  it("displays GPA calculator when there are completed modules", async () => {
    const { getByText, queryByText } = renderWithNavigation(<Track />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(getByText("GPA Calculator")).toBeTruthy();
  });

  describe("edge cases", () => {
    it("shows alert when form is incomplete", async () => {
      const alertMock = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      const { getByText } = renderWithNavigation(<Track />);

      await act(async () => new Promise((r) => setTimeout(r, 100)));

      fireEvent.press(getByText("+"));
      fireEvent.press(getByText("Create"));

      expect(alertMock).toHaveBeenCalledWith("Please fill all fields");
      alertMock.mockRestore();
    });

    it("shows alert when units are not a number", async () => {
      const alertMock = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      const { getByText, getByPlaceholderText } = renderWithNavigation(
        <Track />
      );

      await act(async () => new Promise((r) => setTimeout(r, 100)));
      fireEvent.press(getByText("+"));

      fireEvent.changeText(getByPlaceholderText("Enter module code"), "CS2030");
      fireEvent.changeText(
        getByPlaceholderText("Enter module name"),
        "Programming Methodology II"
      );
      fireEvent.changeText(getByPlaceholderText("Enter category"), "Core");
      fireEvent.changeText(getByPlaceholderText("Enter the MCs"), "four");

      fireEvent.press(getByText("Create"));

      expect(alertMock).toHaveBeenCalledWith("Units must be a number");
      alertMock.mockRestore();
    });

    it("shows alert when completed module has no grade", async () => {
      const alertMock = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      const { getByText, getByPlaceholderText, getByTestId } =
        renderWithNavigation(<Track />);

      await act(async () => new Promise((r) => setTimeout(r, 100)));
      fireEvent.press(getByText("+"));

      fireEvent.changeText(getByPlaceholderText("Enter module code"), "CS2040");
      fireEvent.changeText(
        getByPlaceholderText("Enter module name"),
        "Data Structures"
      );
      fireEvent.changeText(getByPlaceholderText("Enter category"), "Core");
      fireEvent.changeText(getByPlaceholderText("Enter the MCs"), "4");

      fireEvent(getByTestId("completed-switch"), "valueChange", true);

      fireEvent.press(getByText("Create"));

      expect(alertMock).toHaveBeenCalledWith(
        "Please enter the final grade for completed module"
      );
      alertMock.mockRestore();
    });

    it("shows alert for invalid grade", async () => {
      const alertMock = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      const { getByText, getByPlaceholderText, getByTestId } =
        renderWithNavigation(<Track />);

      await act(async () => new Promise((r) => setTimeout(r, 100)));
      fireEvent.press(getByText("+"));

      fireEvent.changeText(getByPlaceholderText("Enter module code"), "CS2040");
      fireEvent.changeText(
        getByPlaceholderText("Enter module name"),
        "Data Structures"
      );
      fireEvent.changeText(getByPlaceholderText("Enter category"), "Core");
      fireEvent.changeText(getByPlaceholderText("Enter the MCs"), "4");

      fireEvent(getByTestId("completed-switch"), "valueChange", true);

      fireEvent.changeText(getByPlaceholderText("Enter your grade"), "Z");

      fireEvent.changeText(
        getByPlaceholderText("Enter the academic year (e.g., 1 for Year 1)"),
        "1"
      );
      fireEvent.changeText(
        getByPlaceholderText("Enter the semester (e.g., 1 for Semester 1)"),
        "1"
      );

      fireEvent.press(getByText("Create"));

      expect(alertMock).toHaveBeenCalledWith(
        "Invalid Grade",
        "Please enter one of the following grades: A+, A, A-, B+, B, B-, C+, C, D+, D, F, CS, CU"
      );
      alertMock.mockRestore();
    });

    it("shows alert when year is missing for completed module", async () => {
      const alertMock = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      const { getByText, getByPlaceholderText, getByTestId } =
        renderWithNavigation(<Track />);

      await act(async () => new Promise((r) => setTimeout(r, 100)));
      fireEvent.press(getByText("+"));

      fireEvent.changeText(getByPlaceholderText("Enter module code"), "CS2040");
      fireEvent.changeText(
        getByPlaceholderText("Enter module name"),
        "Data Structures"
      );
      fireEvent.changeText(getByPlaceholderText("Enter category"), "Core");
      fireEvent.changeText(getByPlaceholderText("Enter the MCs"), "4");
      fireEvent(getByTestId("completed-switch"), "valueChange", true);
      fireEvent.changeText(getByPlaceholderText("Enter your grade"), "A");
      fireEvent.changeText(
        getByPlaceholderText("Enter the semester (e.g., 1 for Semester 1)"),
        "1"
      );

      fireEvent.press(getByText("Create"));

      expect(alertMock).toHaveBeenCalledWith(
        "Please enter the year you completed the module"
      );
      alertMock.mockRestore();
    });

    it("shows alert when year is not a number", async () => {
      const alertMock = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      const { getByText, getByPlaceholderText, getByTestId } =
        renderWithNavigation(<Track />);

      await act(async () => new Promise((r) => setTimeout(r, 100)));
      fireEvent.press(getByText("+"));

      fireEvent.changeText(getByPlaceholderText("Enter module code"), "CS2040");
      fireEvent.changeText(
        getByPlaceholderText("Enter module name"),
        "Data Structures"
      );
      fireEvent.changeText(getByPlaceholderText("Enter category"), "Core");
      fireEvent.changeText(getByPlaceholderText("Enter the MCs"), "4");
      fireEvent(getByTestId("completed-switch"), "valueChange", true);
      fireEvent.changeText(getByPlaceholderText("Enter your grade"), "A");
      fireEvent.changeText(
        getByPlaceholderText("Enter the academic year (e.g., 1 for Year 1)"),
        "first"
      );
      fireEvent.changeText(
        getByPlaceholderText("Enter the semester (e.g., 1 for Semester 1)"),
        "1"
      );

      fireEvent.press(getByText("Create"));

      expect(alertMock).toHaveBeenCalledWith("Year must be a number");
      alertMock.mockRestore();
    });

    it("shows alert when semester is missing for completed module", async () => {
      const alertMock = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      const { getByText, getByPlaceholderText, getByTestId } =
        renderWithNavigation(<Track />);

      await act(async () => new Promise((r) => setTimeout(r, 100)));
      fireEvent.press(getByText("+"));

      fireEvent.changeText(getByPlaceholderText("Enter module code"), "CS2040");
      fireEvent.changeText(
        getByPlaceholderText("Enter module name"),
        "Data Structures"
      );
      fireEvent.changeText(getByPlaceholderText("Enter category"), "Core");
      fireEvent.changeText(getByPlaceholderText("Enter the MCs"), "4");
      fireEvent(getByTestId("completed-switch"), "valueChange", true);
      fireEvent.changeText(getByPlaceholderText("Enter your grade"), "A");
      fireEvent.changeText(
        getByPlaceholderText("Enter the academic year (e.g., 1 for Year 1)"),
        "1"
      );

      fireEvent.press(getByText("Create"));

      expect(alertMock).toHaveBeenCalledWith(
        "Please enter the semester you completed the module"
      );
      alertMock.mockRestore();
    });

    it("shows alert when semester is not a number", async () => {
      const alertMock = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      const { getByText, getByPlaceholderText, getByTestId } =
        renderWithNavigation(<Track />);

      await act(async () => new Promise((r) => setTimeout(r, 100)));
      fireEvent.press(getByText("+"));

      fireEvent.changeText(getByPlaceholderText("Enter module code"), "CS2040");
      fireEvent.changeText(
        getByPlaceholderText("Enter module name"),
        "Data Structures"
      );
      fireEvent.changeText(getByPlaceholderText("Enter category"), "Core");
      fireEvent.changeText(getByPlaceholderText("Enter the MCs"), "4");
      fireEvent(getByTestId("completed-switch"), "valueChange", true);
      fireEvent.changeText(getByPlaceholderText("Enter your grade"), "A");
      fireEvent.changeText(
        getByPlaceholderText("Enter the academic year (e.g., 1 for Year 1)"),
        "1"
      );
      fireEvent.changeText(
        getByPlaceholderText("Enter the semester (e.g., 1 for Semester 1)"),
        "second"
      );

      fireEvent.press(getByText("Create"));

      expect(alertMock).toHaveBeenCalledWith("Semester must be a number");
      alertMock.mockRestore();
    });

    it("shows alert for duplicate module entry", async () => {
      const alertMock = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      const { getByText, getByPlaceholderText } = renderWithNavigation(
        <Track />
      );

      await act(async () => new Promise((r) => setTimeout(r, 100)));
      fireEvent.press(getByText("+"));

      fireEvent.changeText(getByPlaceholderText("Enter module code"), "CS1010");
      fireEvent.changeText(
        getByPlaceholderText("Enter module name"),
        "Programming Methodology"
      );
      fireEvent.changeText(getByPlaceholderText("Enter category"), "Core");
      fireEvent.changeText(getByPlaceholderText("Enter the MCs"), "4");

      fireEvent.press(getByText("Create"));

      expect(alertMock).toHaveBeenCalledWith(
        "Duplicate module",
        "A module with this code already exists."
      );
      alertMock.mockRestore();
    });
  });
});
