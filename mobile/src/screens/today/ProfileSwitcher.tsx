// ProfileSwitcher — sheet content listing profiles, port of the prototype's
// ProfileSwitcher (docs/prototype/screens-profile.jsx) + an "Add a person" row.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Repo } from "../../db/repo";
import { useQuery } from "../../db/useQuery";
import { Avatar } from "../../design/Avatar";
import { Icon } from "../../design/Icon";
import { PressableScale } from "../../design/PressableScale";
import { TOKENS } from "../../design/tokens";
import { ageLabel } from "../../domain/age";

export function ProfileSwitcher({
  repo,
  activeId,
  onPick,
  onAddPerson,
}: {
  repo: Repo;
  activeId: string | null;
  onPick: (id: string) => void;
  onAddPerson: () => void;
}): React.JSX.Element {
  const profiles = useQuery(["profiles"], () => repo.listProfiles());
  return (
    <View style={styles.list}>
      {profiles.map((p) => {
        const active = p.id === activeId;
        const sub = [ageLabel(p.birthDate), p.condition].filter(Boolean).join(" · ");
        return (
          <PressableScale key={p.id} onPress={() => onPick(p.id)}>
            <View style={[styles.row, active ? styles.rowActive : styles.rowIdle]}>
              <Avatar name={p.name} color={p.color ?? TOKENS.approach} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{p.name}</Text>
                {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
              </View>
              {active ? <Icon name="check" size={22} color={TOKENS.yellow} sw={2.6} /> : null}
            </View>
          </PressableScale>
        );
      })}
      <PressableScale onPress={onAddPerson}>
        <View style={[styles.row, styles.rowIdle]}>
          <View style={styles.addGlyph}>
            <Icon name="plus" size={22} color={TOKENS.balance} sw={2} />
          </View>
          <Text style={styles.addLabel}>Add a person</Text>
        </View>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderRadius: 18,
  },
  rowActive: {
    backgroundColor: TOKENS.white,
    borderWidth: 2,
    borderColor: TOKENS.yellow,
  },
  rowIdle: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: TOKENS.lavender,
  },
  rowName: {
    fontSize: 16.5,
    fontFamily: "Sora_700Bold",
    color: TOKENS.anchor,
  },
  rowSub: {
    fontSize: 13,
    color: TOKENS.grey,
  },
  addGlyph: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TOKENS.calm,
    alignItems: "center",
    justifyContent: "center",
  },
  addLabel: {
    fontSize: 16,
    fontFamily: "Sora_600SemiBold",
    color: TOKENS.balance,
  },
});
