// AddPersonForm — add/edit a person, port of the prototype's AddPersonForm
// (docs/prototype/screens-profile.jsx). Fields: name, birth date (date-only
// native picker), sex, avatar colour, and a PFAPA condition toggle. In edit
// mode the form prefills from the existing profile (init-once via useState
// initializers seeded from a useMemo lookup).
import React, { useMemo, useState } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Repo } from "../../db/repo";
import { Avatar } from "../../design/Avatar";
import { Button } from "../../design/Button";
import { Icon } from "../../design/Icon";
import { PressableScale } from "../../design/PressableScale";
import { AVATAR_COLORS, TOKENS } from "../../design/tokens";
import { ageLabel } from "../../domain/age";

function fmtDate(iso: string | null): string {
  if (!iso) return "Not set";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function AddPersonForm({
  repo,
  editProfileId,
  onSaved,
}: {
  repo: Repo;
  editProfileId?: string;
  onSaved: () => void;
}): React.JSX.Element {
  const existing = useMemo(
    () => (editProfileId ? repo.getProfile(editProfileId) : null),
    [editProfileId, repo],
  );
  const editing = !!existing;

  const [name, setName] = useState<string>(existing?.name ?? "");
  const [birthDate, setBirthDate] = useState<string | null>(existing?.birthDate ?? null);
  const [sex, setSex] = useState<string | null>(existing?.sex ?? null);
  const [color, setColor] = useState<string>(existing?.color ?? AVATAR_COLORS[0]);
  const [pfapa, setPfapa] = useState<boolean>(existing?.condition === "PFAPA");
  const [iosPicker, setIosPicker] = useState(false);

  const valid = name.trim().length > 0;
  const age = ageLabel(birthDate);

  const onPickDate = (_e: DateTimePickerEvent, d?: Date) => {
    if (d) setBirthDate(d.toISOString());
  };

  const openDate = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: birthDate ? new Date(birthDate) : new Date(),
        mode: "date",
        onChange: onPickDate,
      });
    } else {
      setIosPicker((v) => !v);
    }
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const patch = {
      name: trimmed,
      sex,
      color,
      birthDate,
      condition: pfapa ? "PFAPA" : null,
    };
    if (existing) repo.updateProfile(existing.id, patch);
    else repo.createProfile(patch);
    onSaved();
  };

  return (
    <View>
      <View style={styles.avatarRow}>
        <Avatar name={name || "?"} color={color} size={76} />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name"
          placeholderTextColor={TOKENS.grey}
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <View style={styles.fieldHeadRow}>
          <Text style={styles.fieldLabel}>Birth date</Text>
          {age ? <Text style={styles.ageHint}>{age} old</Text> : null}
        </View>
        <PressableScale onPress={openDate} style={styles.dateChip}>
          <Icon name="calendar" size={18} color={TOKENS.balance} sw={1.9} />
          <Text style={styles.dateText}>{fmtDate(birthDate)}</Text>
          <Icon name="chevR" size={16} color={TOKENS.grey} sw={2} />
        </PressableScale>
        {iosPicker ? (
          <View style={styles.pickerRow}>
            <DateTimePicker
              value={birthDate ? new Date(birthDate) : new Date()}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              onChange={onPickDate}
            />
            <PressableScale onPress={() => setIosPicker(false)} style={styles.doneChip}>
              <Text style={styles.doneText}>Done</Text>
            </PressableScale>
          </View>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Sex</Text>
        <View style={styles.sexRow}>
          {[
            { k: "male", l: "Male" },
            { k: "female", l: "Female" },
          ].map((o) => {
            const on = sex === o.k;
            return (
              <PressableScale
                key={o.k}
                onPress={() => setSex(on ? null : o.k)}
                style={styles.sexWrap}
              >
                <View style={[styles.sexCell, on ? styles.sexOn : styles.sexOff]}>
                  <Text style={[styles.sexText, { color: on ? TOKENS.white : TOKENS.balance }]}>
                    {o.l}
                  </Text>
                </View>
              </PressableScale>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Colour</Text>
        <View style={styles.colorRow}>
          {AVATAR_COLORS.map((c) => {
            const on = color === c;
            return (
              <PressableScale key={c} onPress={() => setColor(c)}>
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: c },
                    on ? { borderWidth: 3, borderColor: TOKENS.white } : null,
                  ]}
                >
                  {on ? <Icon name="check" size={18} color={TOKENS.white} sw={3} /> : null}
                </View>
              </PressableScale>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Condition</Text>
        <PressableScale onPress={() => setPfapa((v) => !v)}>
          <View style={[styles.condRow, pfapa ? styles.condOn : styles.condOff]}>
            <View style={[styles.condGlyph, { backgroundColor: pfapa ? TOKENS.yellow : TOKENS.calm }]}>
              <Icon name="fever" size={22} color={pfapa ? TOKENS.anchor : TOKENS.balance} sw={1.9} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.condTitle}>PFAPA patient</Text>
              <Text style={styles.condSub}>Tracks the flare cycle & predicts the next window</Text>
            </View>
            <View style={[styles.switch, { backgroundColor: pfapa ? "#1F8A5B" : TOKENS.lavender }]}>
              <View style={[styles.knob, { left: pfapa ? 21 : 3 }]} />
            </View>
          </View>
        </PressableScale>
      </View>

      <View style={styles.saveWrap}>
        <Button onPress={save} disabled={!valid}>
          Save
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarRow: { alignItems: "center", marginBottom: 18 },
  field: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Sora_700Bold",
    color: TOKENS.grey,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  fieldHeadRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  ageHint: { fontSize: 13, fontFamily: "Sora_700Bold", color: TOKENS.approach },
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
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: TOKENS.lavender,
    backgroundColor: TOKENS.white,
    paddingHorizontal: 16,
  },
  dateText: { flex: 1, fontSize: 15.5, fontFamily: "Sora_600SemiBold", color: TOKENS.anchor },
  pickerRow: { marginTop: 10 },
  doneChip: {
    alignSelf: "flex-end",
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: TOKENS.lavender,
    backgroundColor: TOKENS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: { fontSize: 14, fontFamily: "Sora_700Bold", color: TOKENS.balance },
  sexRow: { flexDirection: "row", gap: 8 },
  sexWrap: { flex: 1 },
  sexCell: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sexOn: { backgroundColor: TOKENS.anchor },
  sexOff: { backgroundColor: TOKENS.white, borderWidth: 1.5, borderColor: TOKENS.lavender },
  sexText: { fontSize: 14.5, fontFamily: "Sora_700Bold" },
  colorRow: { flexDirection: "row", gap: 12 },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  condRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderRadius: 16,
    backgroundColor: TOKENS.white,
  },
  condOn: { borderWidth: 2, borderColor: TOKENS.yellow },
  condOff: { borderWidth: 1.5, borderColor: TOKENS.lavender },
  condGlyph: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  condTitle: { fontSize: 15.5, fontFamily: "Sora_700Bold", color: TOKENS.anchor },
  condSub: { fontSize: 12.5, color: TOKENS.grey, lineHeight: 17 },
  switch: { width: 46, height: 28, borderRadius: 999 },
  knob: {
    position: "absolute",
    top: 3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: TOKENS.white,
  },
  saveWrap: { marginTop: 8 },
});
