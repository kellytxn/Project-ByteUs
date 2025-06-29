import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import Chatbot from "../app/(dashboard)/chatbot.jsx";
import { NavigationContainer } from "@react-navigation/native";

import AsyncStorage from "@react-native-async-storage/async-storage";
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
}));

global.fetch = jest.fn();

const Wrapper = ({ children }) => (
  <NavigationContainer>{children}</NavigationContainer>
);

describe("Chatbot Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading initially and then renders welcome message and prompts", async () => {
    AsyncStorage.getItem.mockResolvedValue("fake-token");

    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            status: "ok",
            data: {
              name: "Kelly",
              course: "Computer Science",
              year: 1,
              semester: 1,
              modules: [],
            },
          }),
      })
    );

    const { getByText, queryByText } = render(<Chatbot />, {
      wrapper: Wrapper,
    });

    expect(getByText("Loading...")).toBeTruthy();

    await waitFor(() => {
      expect(queryByText("Loading...")).toBeNull();
      expect(
        getByText(/Hello Kelly! I'm your academic assistant/i)
      ).toBeTruthy();
      expect(
        getByText("What modules should I take this semester?")
      ).toBeTruthy();
    });
  });

  it("adds user message and fetches Gemini reply on input submit", async () => {
    AsyncStorage.getItem.mockResolvedValue("fake-token");

    fetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          json: () =>
            Promise.resolve({
              status: "ok",
              data: {
                name: "Kelly",
                course: "Computer Science",
                year: 1,
                semester: 1,
                modules: [],
              },
            }),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          json: () =>
            Promise.resolve({
              candidates: [
                {
                  content: { parts: [{ text: "This is a Gemini reply." }] },
                },
              ],
            }),
        })
      );

    const { getByPlaceholderText, getByRole, getByText, queryByText } = render(
      <Chatbot />,
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(queryByText("Loading...")).toBeNull());

    const input = getByPlaceholderText("Enter your query");
    const sendButton = getByRole("button");

    fireEvent.changeText(input, "Hello Chatbot");
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(getByText("Hello Chatbot")).toBeTruthy();
      expect(getByText("This is a Gemini reply.")).toBeTruthy();
    });
  });
});
