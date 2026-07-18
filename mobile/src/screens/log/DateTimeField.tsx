// DateTimeField — "Now" chip + a formatted date/time chip that opens the
// native picker. Self-contained; stores/emits ISO strings. Ported from the
// prototype's DateTimeField (here using @react-native-community/datetimepicker
// in place of the web wheel picker).
import React, { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Icon } from "../../design/Icon";
import { PressableScale } from "../../design/PressableScale";
import { themedStyles, useTheme, useTokens } from "../../design/theme";

function dKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(d: Date): string {
  const now = new Date();
  const today = dKey(now);
  const yest = dKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const tom = dKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const k = dKey(d);
  if (k === today) return "Today";
  if (k === yest) return "Yesterday";
  if (k === tom) return "Tomorrow";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function fmtTime(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12 ? "am" : "pm";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${am}`;
}

export function DateTimeField({
  value,
  onChange,
  label = "When",
}: {
  value: string;
  onChange: (iso: string) => void;
  label?: string;
}): React.JSX.Element {
  const styles = useStyles();
  const t = useTokens();
  const { scheme } = useTheme();
  const date = new Date(value);
  const [iosPicker, setIosPicker] = useState<"date" | "time" | null>(null);

  const apply = (next: Date) => onChange(next.toISOString());

  // Android shows the system dialog imperatively, date then time.
  const openAndroid = () => {
    DateTimePickerAndroid.open({
      value: date,
      mode: "date",
      onChange: (_e: DateTimePickerEvent, d?: Date) => {
        if (!d) return;
        const picked = new Date(d);
        DateTimePickerAndroid.open({
          value: picked,
          mode: "time",
          onChange: (_e2: DateTimePickerEvent, t?: Date) => {
            if (!t) return;
            picked.setHours(t.getHours(), t.getMinutes(), 0, 0);
            apply(picked);
          },
        });
      },
    });
  };

  const onIosChange = (_e: DateTimePickerEvent, d?: Date) => {
    if (d) apply(d);
  };

  return (
    <View style={styles.root}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <PressableScale onPress={() => apply(new Date())} style={styles.nowChip}>
          <Icon name="clock" size={16} color={t.balance} sw={2} />
          <Text style={styles.nowText}>Now</Text>
        </PressableScale>
        <PressableScale
          onPress={() => (Platform.OS === "android" ? openAndroid() : setIosPicker("date"))}
          style={styles.valueChip}
        >
          <Icon name="calendar" size={16} color={t.balance} sw={2} />
          <Text style={styles.valueText}>
            {dayLabel(date)} · {fmtTime(date)}
          </Text>
          <Icon name="chevR" size={16} color={t.grey} sw={2} />
        </PressableScale>
      </View>
      {iosPicker ? (
        <View style={styles.pickerRow}>
          <DateTimePicker
            value={date}
            mode={iosPicker}
            display="spinner"
            themeVariant={scheme}
            onChange={onIosChange}
          />
          {iosPicker === "date" ? (
            <PressableScale onPress={() => setIosPicker("time")} style={styles.nextChip}>
              <Text style={styles.nowText}>Set time</Text>
            </PressableScale>
          ) : (
            <PressableScale onPress={() => setIosPicker(null)} style={styles.nextChip}>
              <Text style={styles.nowText}>Done</Text>
            </PressableScale>
          )}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = themedStyles((t) => StyleSheet.create({
  root: { marginBottom: 4 },
  label: {
    fontSize: 13,
    fontFamily: "Sora_700Bold",
    color: t.grey,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  row: { flexDirection: "row", gap: 8 },
  nowChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: t.lavender,
    backgroundColor: t.white,
  },
  nextChip: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: t.lavender,
    backgroundColor: t.white,
    alignSelf: "flex-end",
  },
  nowText: {
    fontSize: 14,
    fontFamily: "Sora_700Bold",
    color: t.balance,
  },
  valueChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: t.lavender,
    backgroundColor: t.white,
  },
  valueText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Sora_600SemiBold",
    color: t.anchor,
  },
  pickerRow: { marginTop: 10 },
}));
