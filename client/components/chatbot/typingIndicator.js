import React, { useState, useEffect } from "react";
import { View, Text, Animated } from "react-native";
import styles from "./styles";

const TypingIndicator = () => {
  const [dotAnimations] = useState([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]);

  useEffect(() => {
    const animateDots = () => {
      const animations = dotAnimations.map((anim, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 200),
            Animated.timing(anim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ])
        )
      );

      animations.forEach((anim) => anim.start());
      return () => animations.forEach((anim) => anim.stop());
    };

    animateDots();
  }, []);

  return (
    <View style={[styles.messageRow, { flexDirection: "row" }]}>
      <View style={[styles.message, styles.geminiMessage]}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={[styles.messageText, styles.geminiMessageText]}>
            Typing
          </Text>
          {dotAnimations.map((anim, index) => (
            <Animated.Text
              key={index}
              style={[
                styles.messageText,
                styles.geminiMessageText,
                {
                  opacity: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                },
              ]}
            >
              .
            </Animated.Text>
          ))}
        </View>
      </View>
    </View>
  );
};

export default TypingIndicator;
