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
import { AVATAR_COLORS } from "../../design/tokens";
import { themedStyles, useTheme, useTokens } from "../../design/theme";
import { ageLabelI18n, fmt, Strings, useT } from "../../i18n";

function fmtDate(iso: string | null, s: Strings): string {
  if (!iso) return s.notSet;
  return new Date(iso).toLocaleDateString(s.locale, { day: "numeric", month: "long", year: "numeric" });
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
  const styles = useStyles();
  const t = useTokens();
  const s = useT();
  const { scheme } = useTheme();
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
  const age = ageLabelI18n(birthDate, s);

  // Inline iOS calendar fires onChange only when a day is actually tapped, so
  // the picker can close itself on selection — no Done button, and no way to
  // dismiss it thinking today's date was saved when nothing was.
  const onPickDate = (_e: DateTimePickerEvent, d?: Date) => {
    if (d) setBirthDate(d.toISOString());
    setIosPicker(false);
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
        <Text style={styles.fieldLabel}>{s.nameLabel}</Text>
        <TextInput
          keyboardAppearance={scheme}
          value={name}
          onChangeText={setName}
          placeholder={s.nameLabel}
          placeholderTextColor={t.grey}
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <View style={styles.fieldHeadRow}>
          <Text style={styles.fieldLabel}>{s.birthDateLabel}</Text>
          {age ? <Text style={styles.ageHint}>{fmt(s.ageOld, { age })}</Text> : null}
        </View>
        <PressableScale onPress={openDate} style={styles.dateChip}>
          <Icon name="calendar" size={18} color={t.balance} sw={1.9} />
          <Text style={styles.dateText}>{fmtDate(birthDate, s)}</Text>
          <Icon name="chevR" size={16} color={t.grey} sw={2} />
        </PressableScale>
        {iosPicker ? (
          <View style={styles.pickerRow}>
            <DateTimePicker
              value={birthDate ? new Date(birthDate) : new Date()}
              mode="date"
              display="inline"
              themeVariant={scheme}
              accentColor={t.anchor}
              maximumDate={new Date()}
              onChange={onPickDate}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{s.sexLabel}</Text>
        <View style={styles.sexRow}>
          {[
            { k: "male", l: s.male },
            { k: "female", l: s.female },
          ].map((o) => {
            const on = sex === o.k;
            return (
              <PressableScale
                key={o.k}
                onPress={() => setSex(on ? null : o.k)}
                style={styles.sexWrap}
              >
                <View style={[styles.sexCell, on ? styles.sexOn : styles.sexOff]}>
                  <Text style={[styles.sexText, { color: on ? t.white : t.balance }]}>
                    {o.l}
                  </Text>
                </View>
              </PressableScale>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{s.colourLabel}</Text>
        <View style={styles.colorRow}>
          {AVATAR_COLORS.map((c) => {
            const on = color === c;
            return (
              <PressableScale key={c} onPress={() => setColor(c)}>
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: c },
                    on ? { borderWidth: 3, borderColor: t.white } : null,
                  ]}
                >
                  {on ? <Icon name="check" size={18} color={t.onAccent} sw={3} /> : null}
                </View>
              </PressableScale>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{s.conditionLabel}</Text>
        <PressableScale onPress={() => setPfapa((v) => !v)}>
          <View style={[styles.condRow, pfapa ? styles.condOn : styles.condOff]}>
            <View style={[styles.condGlyph, { backgroundColor: pfapa ? t.yellow : t.calm }]}>
              <Icon name="fever" size={22} color={pfapa ? t.anchor : t.balance} sw={1.9} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.condTitle}>{s.pfapaPatient}</Text>
              <Text style={styles.condSub}>{s.pfapaSub}</Text>
            </View>
            <View style={[styles.switch, { backgroundColor: pfapa ? "#1F8A5B" : t.lavender }]}>
              <View style={[styles.knob, { left: pfapa ? 21 : 3 }]} />
            </View>
          </View>
        </PressableScale>
      </View>

      <View style={styles.saveWrap}>
        <Button onPress={save} disabled={!valid}>
          {s.save}
        </Button>
      </View>
    </View>
  );
}

const useStyles = themedStyles((t) => StyleSheet.create({
  avatarRow: { alignItems: "center", marginBottom: 18 },
  field: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Sora_700Bold",
    color: t.grey,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  fieldHeadRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  ageHint: { fontSize: 13, fontFamily: "Sora_700Bold", color: t.approach },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: t.lavender,
    backgroundColor: t.white,
    paddingHorizontal: 16,
    fontSize: 16.5,
    fontFamily: "Sora_600SemiBold",
    color: t.anchor,
  },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: t.lavender,
    backgroundColor: t.white,
    paddingHorizontal: 16,
  },
  dateText: { flex: 1, fontSize: 15.5, fontFamily: "Sora_600SemiBold", color: t.anchor },
  pickerRow: { marginTop: 10 },
  sexRow: { flexDirection: "row", gap: 8 },
  sexWrap: { flex: 1 },
  sexCell: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sexOn: { backgroundColor: t.anchor },
  sexOff: { backgroundColor: t.white, borderWidth: 1.5, borderColor: t.lavender },
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
    backgroundColor: t.white,
  },
  condOn: { borderWidth: 2, borderColor: t.yellow },
  condOff: { borderWidth: 1.5, borderColor: t.lavender },
  condGlyph: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  condTitle: { fontSize: 15.5, fontFamily: "Sora_700Bold", color: t.anchor },
  condSub: { fontSize: 12.5, color: t.grey, lineHeight: 17 },
  switch: { width: 46, height: 28, borderRadius: 999 },
  knob: {
    position: "absolute",
    top: 3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: t.white,
  },
  saveWrap: { marginTop: 8 },
}));
