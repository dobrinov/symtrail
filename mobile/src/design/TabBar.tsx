// TabBar — bottom tab bar with raised yellow add button, per docs/prototype/components.jsx.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "./Icon";
import { PressableScale } from "./PressableScale";
import { themedStyles, useTokens } from "./theme";

const TABS = [
  { key: "today", label: "Today", icon: "today" },
  { key: "calendar", label: "Calendar", icon: "calendar" },
  { key: "add", label: "", icon: "plus" },
  { key: "meds", label: "Meds", icon: "syrup" },
  { key: "profile", label: "Profile", icon: "profile" },
] as const;

export function TabBar({
  active,
  onChange,
  onAdd,
}: {
  active: string;
  onChange: (tab: string) => void;
  onAdd: () => void;
}): React.JSX.Element {
  const styles = useStyles();
  const t = useTokens();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 24) }]}>
      <View style={styles.row}>
        {TABS.map((tab) => {
          if (tab.key === "add") {
            return (
              <PressableScale key="add" onPress={onAdd} style={styles.addWrap}>
                <View style={styles.addBtn}>
                  <Icon name="plus" size={30} color={t.onYellow} sw={2.4} />
                </View>
              </PressableScale>
            );
          }
          const on = active === tab.key;
          return (
            <PressableScale key={tab.key} onPress={() => onChange(tab.key)} style={styles.tab}>
              <Icon name={tab.icon} size={26} color={on ? t.anchor : t.grey} sw={on ? 2.1 : 1.8} />
              <Text
                style={[
                  styles.label,
                  {
                    color: on ? t.anchor : t.grey,
                    fontFamily: on ? "Sora_700Bold" : "Sora_400Regular",
                  },
                ]}
              >
                {tab.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = themedStyles((t) => StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    paddingTop: 8,
    // prototype uses a blurred canvas-colored gradient; RN: near-opaque canvas
    backgroundColor: t.canvas + "F5", // frosted bar: canvas at ~96% alpha
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingHorizontal: 14,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingTop: 4,
  },
  label: {
    fontSize: 10.5,
    letterSpacing: 0.1,
  },
  addWrap: {
    alignItems: "center",
    marginTop: -18,
  },
  addBtn: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: t.yellow,
    alignItems: "center",
    justifyContent: "center",
    // prototype: 0 6px 18px rgba(254,174,46,0.5)
    shadowColor: t.yellow,
    shadowOpacity: 0.5,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
}));
