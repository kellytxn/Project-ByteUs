import React from 'react';
import { View, useColorScheme, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';

const ThemedCard = ({ style, children, ...props }) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  return (
    <View
      style={[{ backgroundColor: theme.uibackground }, styles.card]}
      {...props}
    >
      {children}
    </View>
  );
};

export default ThemedCard;

const styles = StyleSheet.create({
    card: {
        boarderRadius: 5,
        padding: 20
    }
})