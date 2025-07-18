import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EBE9E3" },
  messagesContainer: {
    padding: 10,
    paddingTop: 20,
    paddingBottom: 10,
  },
  promptsContainer: {
    paddingVertical: 10,
    maxWidth: "70%",
  },
  message: {
    maxWidth: "70%",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  userMessage: {
    backgroundColor: "#9C7FC5",
    alignSelf: "flex-end",
  },
  geminiMessage: {
    backgroundColor: "white",
    alignSelf: "flex-start",
  },
  messageText: { color: "white" },
  userMessageText: { color: "white" },
  geminiMessageText: { color: "black" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "transparent",
  },
  input: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
    color: "black",
  },
  button: {
    backgroundColor: "#9C7FC5",
    borderRadius: 17.5,
    width: 35,
    height: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  promptButton: {
    backgroundColor: "#E0D8F0",
    padding: 12,
    borderRadius: 20,
    marginVertical: 5,
    alignSelf: "flex-start",
  },
  promptText: {
    color: "#5E4A8A",
    fontWeight: "500",
    maxWidth: "70%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 20,
    backgroundColor: "#EBE9E3",
  },
  loadingText: {
    marginTop: 10,
    color: "#555",
  },
  messageRow: {
    alignItems: "flex-start",
    marginBottom: 5,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 1.5,
  },
});
