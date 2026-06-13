// LogMed — catalogue list (label + brand/strength), dose field prefilled from
// default_dose, optional reminder toggle revealing a DateTimeField, custom-med
// inline form. Port of the prototype's LogMed.
import React, { useMemo, useState } from "react";
import { StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Entry, MedicationType, Repo } from "../../db/repo";
import { useQuery } from "../../db/useQuery";
import { Button } from "../../design/Button";
import { Card } from "../../design/Card";
import { Icon } from "../../design/Icon";
import { PressableScale } from "../../design/PressableScale";
import { TOKENS } from "../../design/tokens";
import { DateTimeField } from "./DateTimeField";

function formIcon(form: string | null): string {
  return form === "tablet" ? "tablet" : form === "drops" ? "drops" : "syrup";
}

function plusHours(iso: string, h: number): string {
  return new Date(new Date(iso).getTime() + h * 3600 * 1000).toISOString();
}

export function LogMed({
  repo,
  profileId,
  onSaved,
  initialDate,
  scheduleReminder,
  editEntryId,
}: {
  repo: Repo;
  profileId: string;
  onSaved: () => void;
  initialDate?: string;
  scheduleReminder?: (entry: Entry, medLabel: string) => void;
  editEntryId?: string;
}): React.JSX.Element {
  const existing = useMemo(() => (editEntryId ? repo.getEntry(editEntryId) : null), [editEntryId, repo]);
  const meds = useQuery(["medication_types"], () => repo.listMedicationTypes());

  const [selected, setSelected] = useState<string | null>(existing?.medicationTypeId ?? null);
  const [dose, setDose] = useState<string>(existing?.dose ?? "");
  const [at, setAt] = useState<string>(existing?.recordedAt ?? initialDate ?? new Date().toISOString());
  const [remind, setRemind] = useState<boolean>(!!existing?.reminderAt);
  const [remindAt, setRemindAt] = useState<string | null>(existing?.reminderAt ?? null);

  const [adding, setAdding] = useState(false);
  const [cLabel, setCLabel] = useState("");
  const [cForm, setCForm] = useState("syrup");
  const [cStrength, setCStrength] = useState("");
  const [cDose, setCDose] = useState("");

  const pick = (m: MedicationType) => {
    setSelected(m.id);
    if (m.defaultDose) setDose(m.defaultDose);
  };

  const toggleRemind = (v: boolean) => {
    setRemind(v);
    if (v && !remindAt) setRemindAt(plusHours(at, 6));
  };

  const addCustom = () => {
    const label = cLabel.trim();
    if (!label) return;
    const created = repo.createMedicationType({
      label,
      form: cForm,
      strength: cStrength.trim() || null,
      defaultDose: cDose.trim() || null,
    });
    setSelected(created.id);
    if (created.defaultDose) setDose(created.defaultDose);
    setAdding(false);
    setCLabel("");
    setCStrength("");
    setCDose("");
  };

  const canSave = !!selected;

  const save = () => {
    if (!selected) return;
    const reminderAt = remind ? remindAt : null;
    let entry: Entry;
    if (existing) {
      repo.updateEntry(existing.id, { medicationTypeId: selected, dose: dose.trim() || null, reminderAt, recordedAt: at });
      entry = repo.getEntry(existing.id)!;
    } else {
      entry = repo.createEntry({
        profileId,
        entryType: "med",
        medicationTypeId: selected,
        dose: dose.trim() || null,
        reminderAt,
        recordedAt: at,
      });
    }
    if (reminderAt && scheduleReminder) {
      const label = meds.find((m) => m.id === selected)?.label ?? "Medication";
      scheduleReminder(entry, label);
    }
    onSaved();
  };

  return (
    <View>
      <Text style={styles.sectionLabel}>Medication</Text>
      <View style={styles.list}>
        {meds.map((m) => {
          const on = selected === m.id;
          const sub = [m.brand, m.strength].filter(Boolean).join(" · ");
          return (
            <PressableScale key={m.id} onPress={() => pick(m)} style={[styles.row, on && styles.rowOn]}>
              <View style={[styles.glyph, { backgroundColor: (m.color ?? TOKENS.balance) + "22" }]}>
                <Icon name={formIcon(m.form)} size={20} color={m.color ?? TOKENS.balance} sw={1.9} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.medLabel, on && styles.medLabelOn]}>{m.label}</Text>
                {sub ? <Text style={[styles.medSub, on && styles.medSubOn]}>{sub}</Text> : null}
              </View>
              {on ? <Icon name="check" size={20} color={TOKENS.yellow} sw={2.4} /> : null}
            </PressableScale>
          );
        })}
      </View>

      {/* add custom */}
      {adding ? (
        <Card pad={14} style={styles.customCard}>
          <TextInput value={cLabel} onChangeText={setCLabel} placeholder="Name (e.g. Calpol)" placeholderTextColor={TOKENS.approach} style={styles.input} />
          <TextInput value={cStrength} onChangeText={setCStrength} placeholder="Strength (e.g. 120mg/5ml)" placeholderTextColor={TOKENS.approach} style={[styles.input, { marginTop: 8 }]} />
          <TextInput value={cDose} onChangeText={setCDose} placeholder="Default dose (e.g. 5 ml)" placeholderTextColor={TOKENS.approach} style={[styles.input, { marginTop: 8 }]} />
          <View style={styles.formRow}>
            {["syrup", "tablet", "drops"].map((f) => {
              const on = cForm === f;
              return (
                <PressableScale key={f} onPress={() => setCForm(f)} style={[styles.formChip, on ? styles.formChipOn : styles.formChipOff]}>
                  <Text style={[styles.formChipText, on && { color: TOKENS.anchor }]}>{f}</Text>
                </PressableScale>
              );
            })}
          </View>
          <View style={{ marginTop: 12 }}>
            <Button onPress={addCustom} disabled={!cLabel.trim()}>Add medication</Button>
          </View>
        </Card>
      ) : (
        <PressableScale onPress={() => setAdding(true)} style={styles.addRow}>
          <Icon name="plus" size={18} color={TOKENS.balance} sw={2.2} />
          <Text style={styles.addText}>Add custom medication</Text>
        </PressableScale>
      )}

      {/* dose */}
      <Text style={[styles.sectionLabel, { marginTop: 18 }]}>Dose</Text>
      <TextInput
        value={dose}
        onChangeText={setDose}
        placeholder="e.g. 5 ml"
        placeholderTextColor={TOKENS.approach}
        style={styles.input}
      />

      {/* reminder */}
      <Card pad={14} style={styles.reminderCard}>
        <View style={styles.reminderHead}>
          <View style={styles.bellGlyph}>
            <Icon name="bell" size={20} color={remind ? TOKENS.balance : TOKENS.approach} sw={1.9} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reminderTitle}>Remind me for the next dose</Text>
            <Text style={styles.reminderSub}>Push notification</Text>
          </View>
          <Switch value={remind} onValueChange={toggleRemind} trackColor={{ true: TOKENS.yellow, false: TOKENS.lavender }} />
        </View>
        {remind && remindAt ? (
          <View style={styles.reminderBody}>
            <DateTimeField value={remindAt} onChange={(v) => setRemindAt(v)} label="Remind me at" />
          </View>
        ) : null}
      </Card>

      <View style={styles.when}>
        <DateTimeField value={at} onChange={setAt} />
      </View>

      <Button onPress={save} disabled={!canSave}>Save</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Sora_700Bold",
    color: TOKENS.grey,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  list: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: TOKENS.calm,
    backgroundColor: TOKENS.white,
  },
  rowOn: { borderColor: TOKENS.anchor },
  glyph: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  medLabel: { fontSize: 15.5, fontFamily: "Sora_600SemiBold", color: TOKENS.anchor },
  medLabelOn: { color: TOKENS.anchor },
  medSub: { fontSize: 12.5, color: TOKENS.grey },
  medSubOn: { color: TOKENS.grey },
  customCard: { marginTop: 10 },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 50,
    marginTop: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: TOKENS.lavender,
    borderStyle: "dashed",
    backgroundColor: TOKENS.white,
  },
  addText: { fontSize: 15, fontFamily: "Sora_600SemiBold", color: TOKENS.balance },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: TOKENS.lavender,
    backgroundColor: TOKENS.white,
    paddingHorizontal: 16,
    fontSize: 16.5,
    fontFamily: "Sora_600SemiBold",
    color: TOKENS.anchor,
  },
  formRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  formChip: { flex: 1, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  formChipOn: { backgroundColor: TOKENS.yellow },
  formChipOff: { backgroundColor: TOKENS.white, borderWidth: 1.5, borderColor: TOKENS.lavender },
  formChipText: { fontSize: 13.5, fontFamily: "Sora_700Bold", color: TOKENS.balance },
  reminderCard: { marginTop: 18 },
  reminderHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  bellGlyph: { width: 38, height: 38, borderRadius: 11, backgroundColor: TOKENS.calm, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  reminderTitle: { fontSize: 15.5, fontFamily: "Sora_600SemiBold", color: TOKENS.anchor },
  reminderSub: { fontSize: 12.5, color: TOKENS.grey },
  reminderBody: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: TOKENS.calm },
  when: { marginTop: 18, marginBottom: 20 },
});
