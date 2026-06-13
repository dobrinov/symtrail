// Placeholder — replaced by the full Calendar screen in Task 17.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { TOKENS } from "../../design/tokens";

export default function Calendar(): React.JSX.Element {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Calendar</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: TOKENS.canvas },
  text: { fontSize: 18, fontFamily: "Sora_700Bold", color: TOKENS.anchor },
});
