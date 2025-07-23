import React from "react";
import { render, act } from "@testing-library/react-native";
import Chatbot from "../app/(dashboard)/chatbot";
import { getToken, getMcsToGraduate } from "../services/storageService";

// Mock all dependencies
jest.mock("../services/storageService", () => ({
  getToken: jest.fn(),
  getMcsToGraduate: jest.fn(),
}));
jest.mock("../components/chatbot/messageBubble", () => {
  const { Text } = require("react-native");
  return ({ item }) => <Text testID="message-bubble">{item.text}</Text>;
});
jest.mock("../components/chatbot/typingIndicator", () => "TypingIndicator");
jest.mock("../components/chatbot/promptButton", () => "PromptButton");

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

describe("chatbot", () => {
  beforeEach(() => {
    getToken.mockResolvedValue(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImtlbGx5dHR0YW5AZ21haWwuY29tIiwiaWF0IjoxNzUyODI4MDczfQ.GNUIDQScVfXcoNFxeG18rCFQUoNjJ1puMDUfOQhYMXY"
    );
    getMcsToGraduate.mockResolvedValue(80);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls backend and displays welcome message", async () => {
    jest.spyOn(console, "error").mockImplementation((msg) => {
      if (typeof msg === "string" && msg.includes("Error fetching user data")) {
        console.log("DEBUG:", msg);
      }
    });

    const { findByTestId } = render(<Chatbot />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    });

    const bubble = await findByTestId("message-bubble");
    expect(bubble).toBeTruthy();
    expect(bubble.props.children).toMatch(/Hello .*!/);
    expect(bubble.props.children).toMatch(/common questions/);
  });
});
