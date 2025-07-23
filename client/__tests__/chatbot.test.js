import React from "react";
import { render, act, fireEvent, waitFor } from "@testing-library/react-native";
import Chatbot from "../app/(dashboard)/chatbot";
import { fetchUserData } from "../services/userService";
import { fetchGeminiResponse } from "../services/chatbotService";
import { getToken, getMcsToGraduate } from "../services/storageService";

// Mock all dependencies
jest.mock("../services/userService", () => ({
  fetchUserData: jest.fn(),
}));
jest.mock("../services/chatbotService", () => ({
  fetchGeminiResponse: jest.fn(),
}));
jest.mock("../services/storageService", () => ({
  getToken: jest.fn(),
  getMcsToGraduate: jest.fn(),
}));
jest.mock("../components/chatbot/messageBubble", () => {
  const { Text } = require("react-native");
  return ({ item }) => <Text testID="message-bubble">{item.text}</Text>;
});
jest.mock("../components/chatbot/typingIndicator", () => "TypingIndicator");
jest.mock("../components/chatbot/promptButton", () => {
  const { Text, Pressable } = require("react-native");
  return ({ item }) => (
    <Pressable onPress={item.action}>
      <Text testID={`prompt-${item.id}`}>{item.text}</Text>
    </Pressable>
  );
});
jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");

  RN.FlatList = ({ data, renderItem, ...props }) => {
    const MockedFlatList = require("react-native").FlatList;
    return (
      <MockedFlatList
        data={data}
        renderItem={renderItem}
        {...props}
        testID="flatlist-mock"
      />
    );
  };

  return RN;
});
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe("Chatbot Component", () => {
  const mockUserData = {
    name: "John Doe",
    email: "john@example.com",
    course: "Computer Science",
    year: 2,
    semester: 1,
    profilePic: null,
    modules: [
      { code: "CS1010", name: "Programming Methodology", grade: "A", units: 4 },
    ],
  };

  beforeEach(() => {
    getToken.mockResolvedValue("mock-token");
    getMcsToGraduate.mockResolvedValue(80);
    fetchUserData.mockResolvedValue({ status: "ok", data: mockUserData });
    fetchGeminiResponse.mockImplementation((prompt) =>
      Promise.resolve(`Mock response to: ${prompt}`)
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state initially", async () => {
    fetchUserData.mockImplementationOnce(() => new Promise(() => {}));
    const { getByText } = render(<Chatbot />);
    expect(getByText("Loading...")).toBeTruthy();
  });

  it("displays welcome message after loading", async () => {
    const { findByTestId } = render(<Chatbot />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const welcomeMessage = await findByTestId("message-bubble");
    expect(welcomeMessage.props.children).toMatch(/Hello John Doe!/);
    expect(welcomeMessage.props.children).toMatch(
      /common questions you might have/
    );
  });

  it("displays all prompt buttons after welcome", async () => {
    const { findByTestId } = render(<Chatbot />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(await findByTestId("prompt-1")).toBeTruthy();
    expect(await findByTestId("prompt-2")).toBeTruthy();
    expect(await findByTestId("prompt-3")).toBeTruthy();
  });

  it("handles prompt button presses correctly", async () => {
    const { findByTestId, findAllByTestId } = render(<Chatbot />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const prompt1 = await findByTestId("prompt-1");
    fireEvent.press(prompt1);

    await waitFor(async () => {
      const messages = await findAllByTestId("message-bubble");
      expect(
        messages.some((m) => m.props.children.includes("Mock response to:"))
      ).toBe(true);
    });

    const prompt2 = await findByTestId("prompt-2");
    fireEvent.press(prompt2);

    await waitFor(async () => {
      const messages = await findAllByTestId("message-bubble");
      expect(
        messages.some((m) => m.props.children.includes("Mock response to:"))
      ).toBe(true);
    });

    const prompt3 = await findByTestId("prompt-3");
    fireEvent.press(prompt3);

    await waitFor(async () => {
      const messages = await findAllByTestId("message-bubble");
      expect(
        messages.some((m) => m.props.children.includes("Mock response to:"))
      ).toBe(true);
    });
  });
});
