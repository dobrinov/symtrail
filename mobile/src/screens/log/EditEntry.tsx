// EditEntry — thin wrapper that renders the matching Log* sheet pre-filled
// from the entry. Each Log* takes an `editEntryId` that switches its save path
// from createEntry to updateEntry, so the edit flow reuses the create UI.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Entry, Repo } from "../../db/repo";
import { TOKENS } from "../../design/tokens";
import { LogMed } from "./LogMed";
import { LogSymptom } from "./LogSymptom";
import { LogTemp } from "./LogTemp";

export function EditEntry({
  repo,
  entry,
  onSaved,
  tempUnit = "c",
  isPfapa = false,
}: {
  repo: Repo;
  entry: Entry;
  onSaved: () => void;
  tempUnit?: "c" | "f";
  isPfapa?: boolean;
}): React.JSX.Element {
  if (entry.entryType === "temp") {
    return <LogTemp repo={repo} profileId={entry.profileId} onSaved={onSaved} tempUnit={tempUnit} editEntryId={entry.id} />;
  }
  if (entry.entryType === "med") {
    return <LogMed repo={repo} profileId={entry.profileId} onSaved={onSaved} editEntryId={entry.id} />;
  }
  if (entry.entryType === "symptom") {
    return <LogSymptom repo={repo} profileId={entry.profileId} onSaved={onSaved} isPfapa={isPfapa} editEntryId={entry.id} />;
  }
  // Notes have no dedicated sheet in Task 16.
  return (
    <View style={styles.fallback}>
      <Text style={styles.fallbackText}>This entry type can't be edited yet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { padding: 24, alignItems: "center" },
  fallbackText: { fontSize: 15, color: TOKENS.grey, fontFamily: "Sora_600SemiBold" },
});
