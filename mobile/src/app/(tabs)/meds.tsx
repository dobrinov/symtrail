// Placeholder — replaced by the full Meds screen in Task 18.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { TOKENS } from "../../design/tokens";

export default function Meds(): React.JSX.Element {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Meds</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: TOKENS.canvas },
  text: { fontSize: 18, fontFamily: "Sora_700Bold", color: TOKENS.anchor },
});
