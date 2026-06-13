// LogSymptom — catalogue grid grouped by group_name, severity chip row,
// when picker, custom-symptom inline form. Port of the prototype's LogSymptom.
// Supports an editEntryId pre-fill path (used by EditEntry).
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Repo, SymptomType } from "../../db/repo";
import { useQuery } from "../../db/useQuery";
import { Button } from "../../design/Button";
import { Icon } from "../../design/Icon";
import { PressableScale } from "../../design/PressableScale";
import { TOKENS } from "../../design/tokens";
import { SEVERITY, SEVERITY_ORDER, SeverityKey } from "../../domain/severity";
import { DateTimeField } from "./DateTimeField";

// A small subset of glyphs offered when creating a custom symptom.
const CUSTOM_ICONS = ["rash", "tummy", "headache", "cough", "fatigue", "jointpain", "nausea", "earpain"];

// PFAPA group first for PFAPA profiles, then Infection, General, then any
// custom groups in catalogue order.
function orderGroups(types: SymptomType[], isPfapa: boolean): [string, SymptomType[]][] {
  const groups = new Map<string, SymptomType[]>();
  for (const t of types) {
    const g = t.groupName ?? "General";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(t);
  }
  const preferred = isPfapa ? ["PFAPA", "Infection", "General"] : ["General", "Infection", "PFAPA"];
  const ordered: [string, SymptomType[]][] = [];
  for (const g of preferred) {
    if (groups.has(g)) {
      ordered.push([g, groups.get(g)!]);
      groups.delete(g);
    }
  }
  for (const [g, list] of groups) ordered.push([g, list]);
  return ordered;
}

export function LogSymptom({
  repo,
  profileId,
  onSaved,
  initialDate,
  isPfapa = false,
  editEntryId,
}: {
  repo: Repo;
  profileId: string;
  onSaved: () => void;
  initialDate?: string;
  isPfapa?: boolean;
  editEntryId?: string;
}): React.JSX.Element {
  const existing = useMemo(() => (editEntryId ? repo.getEntry(editEntryId) : null), [editEntryId, repo]);
  const types = useQuery(["symptom_types"], () => repo.listSymptomTypes());

  const [selected, setSelected] = useState<string | null>(existing?.symptomTypeId ?? null);
  const [severity, setSeverity] = useState<SeverityKey | null>((existing?.severity as SeverityKey) ?? null);
  const [at, setAt] = useState<string>(existing?.recordedAt ?? initialDate ?? new Date().toISOString());

  const [adding, setAdding] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customIcon, setCustomIcon] = useState(CUSTOM_ICONS[0]);

  const sections = orderGroups(types, isPfapa);
  const canSave = !!selected && !!severity;

  const addCustom = () => {
    const label = customLabel.trim();
    if (!label) return;
    const created = repo.createSymptomType({ label, icon: customIcon, groupName: "General" });
    setSelected(created.id);
    setAdding(false);
    setCustomLabel("");
  };

  const save = () => {
    if (!selected || !severity) return;
    if (existing) {
      repo.updateEntry(existing.id, { symptomTypeId: selected, severity, recordedAt: at });
    } else {
      repo.createEntry({
        profileId,
        entryType: "symptom",
        symptomTypeId: selected,
        severity,
        recordedAt: at,
      });
    }
    onSaved();
  };

  return (
    <View>
      {sections.map(([label, syms]) => (
        <View key={label} style={styles.section}>
          <Text style={styles.sectionLabel}>{label}</Text>
          <View style={styles.grid}>
            {syms.map((s) => {
              const on = selected === s.id;
              return (
                <PressableScale
                  key={s.id}
                  onPress={() => setSelected(s.id)}
                  style={[styles.tile, on ? styles.tileOn : styles.tileOff]}
                >
                  <Icon name={s.icon ?? "note"} size={26} color={on ? TOKENS.yellow : TOKENS.balance} sw={1.8} />
                  <Text style={[styles.tileLabel, on && styles.tileLabelOn]} numberOfLines={2}>
                    {s.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </View>
      ))}

      {/* add your own */}
      <View style={styles.section}>
        {adding ? (
          <View>
            <Text style={styles.sectionLabel}>New symptom</Text>
            <TextInput
              value={customLabel}
              onChangeText={setCustomLabel}
              placeholder="e.g. Cramps, sore eyes…"
              placeholderTextColor={TOKENS.approach}
              style={styles.input}
            />
            <View style={[styles.grid, { marginTop: 10 }]}>
              {CUSTOM_ICONS.map((ic) => {
                const on = customIcon === ic;
                return (
                  <PressableScale
                    key={ic}
                    onPress={() => setCustomIcon(ic)}
                    style={[styles.iconPick, on ? styles.tileOn : styles.tileOff]}
                  >
                    <Icon name={ic} size={24} color={on ? TOKENS.yellow : TOKENS.balance} sw={1.8} />
                  </PressableScale>
                );
              })}
            </View>
            <View style={{ marginTop: 12 }}>
              <Button onPress={addCustom} disabled={!customLabel.trim()}>
                Add symptom
              </Button>
            </View>
          </View>
        ) : (
          <PressableScale onPress={() => setAdding(true)} style={styles.addRow}>
            <Icon name="plus" size={18} color={TOKENS.balance} sw={2.2} />
            <Text style={styles.addText}>Add custom symptom</Text>
          </PressableScale>
        )}
      </View>

      {/* severity */}
      <Text style={styles.sectionLabel}>Severity</Text>
      <View style={styles.sevRow}>
        {SEVERITY_ORDER.slice(1).map((key) => {
          const s = SEVERITY[key];
          const on = severity === key;
          return (
            <PressableScale
              key={key}
              onPress={() => setSeverity(key)}
              style={[
                styles.sevChip,
                on ? { backgroundColor: s.color } : styles.sevChipOff,
              ]}
            >
              <Text style={[styles.sevChipText, { color: on ? s.text : TOKENS.balance }]}>{s.label}</Text>
            </PressableScale>
          );
        })}
      </View>

      <View style={styles.when}>
        <DateTimeField value={at} onChange={setAt} />
      </View>

      <Button onPress={save} disabled={!canSave}>
        Save
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 16 },
  sectionLabel: {
    fontSize: 12.5,
    fontFamily: "Sora_700Bold",
    color: TOKENS.grey,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 9,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: {
    width: "23%",
    minWidth: 72,
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 15,
  },
  tileOn: { backgroundColor: TOKENS.anchor },
  tileOff: { backgroundColor: TOKENS.white, borderWidth: 1.5, borderColor: TOKENS.calm },
  tileLabel: {
    fontSize: 10.5,
    fontFamily: "Sora_600SemiBold",
    color: TOKENS.anchor,
    textAlign: "center",
  },
  tileLabelOn: { color: TOKENS.white },
  iconPick: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: TOKENS.lavender,
    borderStyle: "dashed",
    backgroundColor: TOKENS.white,
  },
  addText: { fontSize: 15, fontFamily: "Sora_600SemiBold", color: TOKENS.balance },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: TOKENS.lavender,
    backgroundColor: TOKENS.white,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "Sora_600SemiBold",
    color: TOKENS.anchor,
  },
  sevRow: { flexDirection: "row", gap: 7, marginBottom: 18 },
  sevChip: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  sevChipOff: { backgroundColor: TOKENS.white, borderWidth: 1.5, borderColor: TOKENS.lavender },
  sevChipText: { fontSize: 13.5, fontFamily: "Sora_700Bold" },
  when: { marginBottom: 20 },
});
