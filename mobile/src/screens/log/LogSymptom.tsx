// LogSymptom — wizard-style accordion: Symptom → Severity → When sections.
// Picking a value collapses the section to a summary row and opens the next;
// tapping a collapsed header reopens it to change the value. Catalogue grid
// grouped by group_name, custom-symptom inline form, editEntryId pre-fill
// path (used by EditEntry — starts fully collapsed since all values exist).
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Repo, SymptomType } from "../../db/repo";
import { useQuery } from "../../db/useQuery";
import { Button } from "../../design/Button";
import { Icon } from "../../design/Icon";
import { PressableScale } from "../../design/PressableScale";
import { SeverityChip } from "../../design/SeverityChip";
import { themedStyles, useTheme, useTokens } from "../../design/theme";
import { SEVERITY, SEVERITY_ORDER, SeverityKey } from "../../domain/severity";
import { DateTimeField } from "./DateTimeField";

// A small subset of glyphs offered when creating a custom symptom.
const CUSTOM_ICONS = ["rash", "tummy", "headache", "cough", "fatigue", "jointpain", "nausea", "earpain"];

type SectionKey = "symptom" | "severity" | "when";

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

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const key = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const day =
    key(d) === key(now) ? "Today" :
    key(d) === key(yest) ? "Yesterday" :
    d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  let h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12 ? "am" : "pm";
  h = h % 12;
  if (h === 0) h = 12;
  return `${day} · ${h}:${String(m).padStart(2, "0")} ${am}`;
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
  const styles = useStyles();
  const t = useTokens();
  const { scheme } = useTheme();
  const existing = useMemo(() => (editEntryId ? repo.getEntry(editEntryId) : null), [editEntryId, repo]);
  const types = useQuery(["symptom_types"], () => repo.listSymptomTypes());

  const [selected, setSelected] = useState<string | null>(existing?.symptomTypeId ?? null);
  const [severity, setSeverity] = useState<SeverityKey | null>((existing?.severity as SeverityKey) ?? null);
  const [at, setAt] = useState<string>(existing?.recordedAt ?? initialDate ?? new Date().toISOString());
  // Wizard: edits start fully collapsed (everything has a value); new entries
  // open on the symptom picker.
  const [open, setOpen] = useState<SectionKey | null>(existing ? null : "symptom");

  const [adding, setAdding] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customIcon, setCustomIcon] = useState(CUSTOM_ICONS[0]);

  const sections = orderGroups(types, isPfapa);
  const canSave = !!selected && !!severity;
  const selectedType = selected ? types.find((s) => s.id === selected) : undefined;

  const toggle = (key: SectionKey) => setOpen((o) => (o === key ? null : key));

  const pickSymptom = (id: string) => {
    setSelected(id);
    setOpen(severity ? "when" : "severity");
  };

  const pickSeverity = (key: SeverityKey) => {
    setSeverity(key);
    setOpen("when");
  };

  const addCustom = () => {
    const label = customLabel.trim();
    if (!label) return;
    const created = repo.createSymptomType({ label, icon: customIcon, groupName: "General" });
    setAdding(false);
    setCustomLabel("");
    pickSymptom(created.id);
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
      {/* ── Symptom ── */}
      <Section
        title="Symptom"
        open={open === "symptom"}
        onToggle={() => toggle("symptom")}
        summary={
          selectedType ? (
            <View style={styles.symptomSummary}>
              <Icon name={selectedType.icon ?? "note"} size={18} color={t.balance} sw={1.9} />
              <Text style={styles.summaryText}>{selectedType.label}</Text>
            </View>
          ) : (
            <Text style={styles.summaryHint}>Choose a symptom</Text>
          )
        }
      >
        {sections.map(([label, syms]) => (
          <View key={label} style={styles.group}>
            <Text style={styles.groupLabel}>{label}</Text>
            <View style={styles.grid}>
              {syms.map((s) => {
                const on = selected === s.id;
                return (
                  <PressableScale
                    key={s.id}
                    onPress={() => pickSymptom(s.id)}
                    style={[styles.tile, on ? styles.tileOn : styles.tileOff]}
                  >
                    <Icon name={s.icon ?? "note"} size={26} color={on ? t.yellow : t.balance} sw={1.8} />
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
        {adding ? (
          <View>
            <Text style={styles.groupLabel}>New symptom</Text>
            <TextInput
              keyboardAppearance={scheme}
              value={customLabel}
              onChangeText={setCustomLabel}
              placeholder="e.g. Cramps, sore eyes…"
              placeholderTextColor={t.approach}
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
                    <Icon name={ic} size={24} color={on ? t.yellow : t.balance} sw={1.8} />
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
            <Icon name="plus" size={18} color={t.balance} sw={2.2} />
            <Text style={styles.addText}>Add custom symptom</Text>
          </PressableScale>
        )}
      </Section>

      {/* ── Severity ── */}
      <Section
        title="Severity"
        open={open === "severity"}
        onToggle={() => toggle("severity")}
        summary={
          severity ? <SeverityChip level={severity} /> : <Text style={styles.summaryHint}>How bad is it?</Text>
        }
      >
        <View style={styles.sevRow}>
          {SEVERITY_ORDER.slice(1).map((key) => {
            const s = SEVERITY[key];
            const on = severity === key;
            return (
              <PressableScale
                key={key}
                onPress={() => pickSeverity(key)}
                style={[
                  styles.sevChip,
                  on ? { backgroundColor: s.color } : styles.sevChipOff,
                ]}
              >
                <Text style={[styles.sevChipText, { color: on ? s.text : t.balance }]}>{s.label}</Text>
              </PressableScale>
            );
          })}
        </View>
      </Section>

      {/* ── When ── */}
      <Section
        title="When"
        open={open === "when"}
        onToggle={() => toggle("when")}
        summary={<Text style={styles.summaryText}>{fmtWhen(at)}</Text>}
      >
        <DateTimeField value={at} onChange={setAt} label="" />
      </Section>

      <View style={styles.saveWrap}>
        <Button onPress={save} disabled={!canSave}>
          Save
        </Button>
      </View>
    </View>
  );
}

// Accordion section: header shows the title plus the current value (summary)
// when collapsed; tapping toggles the body.
function Section({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string;
  summary: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  const styles = useStyles();
  const t = useTokens();
  return (
    <View style={[styles.accCard, open && styles.accCardOpen]}>
      <PressableScale onPress={onToggle} style={styles.accHeader} testID={`section-${title.toLowerCase()}`}>
        <Text style={styles.accTitle}>{title}</Text>
        <View style={styles.accSummary}>{open ? null : summary}</View>
        <Icon name={open ? "chevD" : "chevR"} size={17} color={t.grey} sw={2.2} />
      </PressableScale>
      {open ? <View style={styles.accBody}>{children}</View> : null}
    </View>
  );
}

const useStyles = themedStyles((t) => StyleSheet.create({
  accCard: {
    backgroundColor: t.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: t.calm,
    marginBottom: 10,
  },
  accCardOpen: { borderColor: t.lavender },
  accHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  accTitle: {
    fontSize: 12.5,
    fontFamily: "Sora_700Bold",
    color: t.grey,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  accSummary: { flex: 1, alignItems: "flex-end" },
  accBody: { paddingHorizontal: 14, paddingBottom: 14 },
  symptomSummary: { flexDirection: "row", alignItems: "center", gap: 7 },
  summaryText: { fontSize: 14.5, fontFamily: "Sora_600SemiBold", color: t.anchor },
  summaryHint: { fontSize: 13.5, color: t.approach, fontFamily: "Sora_600SemiBold" },
  group: { marginBottom: 14 },
  groupLabel: {
    fontSize: 12.5,
    fontFamily: "Sora_700Bold",
    color: t.grey,
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
  tileOn: { backgroundColor: t.anchor },
  tileOff: { backgroundColor: t.white, borderWidth: 1.5, borderColor: t.calm },
  tileLabel: {
    fontSize: 10.5,
    fontFamily: "Sora_600SemiBold",
    color: t.anchor,
    textAlign: "center",
  },
  tileLabelOn: { color: t.white },
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
    borderColor: t.lavender,
    borderStyle: "dashed",
    backgroundColor: t.white,
  },
  addText: { fontSize: 15, fontFamily: "Sora_600SemiBold", color: t.balance },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: t.lavender,
    backgroundColor: t.white,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "Sora_600SemiBold",
    color: t.anchor,
  },
  sevRow: { flexDirection: "row", gap: 7 },
  sevChip: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  sevChipOff: { backgroundColor: t.white, borderWidth: 1.5, borderColor: t.lavender },
  sevChipText: { fontSize: 13.5, fontFamily: "Sora_700Bold" },
  saveWrap: { marginTop: 10 },
}));
