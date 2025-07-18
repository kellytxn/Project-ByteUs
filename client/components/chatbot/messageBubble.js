import React from "react";
import { View, Text, Image } from "react-native";
import { renderFormattedText } from "../../utils/textFormatter";
import styles from "./styles";

const USER_AVATAR = require("../../assets/Default.png.jpeg");

const MessageBubble = ({ item, profilePic }) => {
  const isUser = item.sender === "user";

  return (
    <View
      style={[
        styles.messageRow,
        { flexDirection: isUser ? "row-reverse" : "row" },
      ]}
    >
      {isUser && (
        <Image
          source={
            profilePic
              ? { uri: `data:image/jpeg;base64,${profilePic}` }
              : USER_AVATAR
          }
          style={styles.avatar}
        />
      )}

      <View
        style={[
          styles.message,
          isUser ? styles.userMessage : styles.geminiMessage,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.geminiMessageText,
          ]}
        >
          {renderFormattedText(item.text)}
        </Text>
      </View>
    </View>
  );
};

export default MessageBubble;
