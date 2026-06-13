// ProfileScreen — people management, tools (doctor report, settings), sign-out
// and account deletion. Port of the prototype's ProfileScreen
// (docs/prototype/screens-profile.jsx). All actions are explicit props so the
// hosting route owns the sheets and side effects; people are read reactively.
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Repo } from "../../db/repo";
import { useQuery } from "../../db/useQuery";
import { Avatar } from "../../design/Avatar";
import { Card } from "../../design/Card";
import { Icon } from "../../design/Icon";
import { PressableScale } from "../../design/PressableScale";
import { TOKENS } from "../../design/tokens";
import { ageLabel } from "../../domain/age";

function lastSyncedLabel(iso: string | null): string {
  if (!iso) return "Never synced";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "Never synced";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "Last synced just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `Last synced ${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Last synced ${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `Last synced ${days} day${days === 1 ? "" : "s"} ago`;
}

export function ProfileScreen({
  repo,
  activeId,
  onPickProfile,
  onEditProfile,
  onAddPerson,
  onDeleteProfile,
  onOpenSettings,
  onOpenReport,
  onSignOut,
  onDeleteAccount,
  lastSyncedAt,
}: {
  repo: Repo;
  activeId: string | null;
  onPickProfile: (id: string) => void;
  onEditProfile: (id: string) => void;
  onAddPerson: () => void;
  onDeleteProfile: (id: string) => void;
  onOpenSettings: () => void;
  onOpenReport: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  lastSyncedAt: string | null;
}): React.JSX.Element {
  const profiles = useQuery(["profiles"], () => repo.listProfiles());

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Profiles</Text>

      <View style={styles.peopleList}>
        {profiles.map((p) => {
          const active = p.id === activeId;
          const sub = [ageLabel(p.birthDate), p.condition].filter(Boolean).join(" · ");
          return (
            <PressableScale key={p.id} onPress={() => onPickProfile(p.id)}>
              <Card pad={14} style={[styles.personRow, active ? styles.personActive : styles.personIdle]}>
                <Avatar name={p.name} color={p.color ?? TOKENS.approach} size={46} />
                <View style={styles.personMeta}>
                  <View style={styles.personNameRow}>
                    <Text style={styles.personName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    {active ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>Active</Text>
                      </View>
                    ) : null}
                  </View>
                  {sub ? <Text style={styles.personSub}>{sub}</Text> : null}
                </View>
                <PressableScale onPress={() => onEditProfile(p.id)} style={styles.roundBtn}>
                  <Icon name="edit" size={18} color={TOKENS.balance} sw={1.9} />
                </PressableScale>
                <PressableScale onPress={() => onDeleteProfile(p.id)} style={styles.roundBtnBare}>
                  <Icon name="trash" size={20} color={TOKENS.grey} sw={1.8} />
                </PressableScale>
              </Card>
            </PressableScale>
          );
        })}

        <PressableScale onPress={onAddPerson}>
          <View style={styles.addRow}>
            <View style={styles.addGlyph}>
              <Icon name="plus" size={24} color={TOKENS.balance} sw={2.2} />
            </View>
            <Text style={styles.addLabel}>Add a person</Text>
          </View>
        </PressableScale>
      </View>

      <Text style={styles.sectionHeader}>Tools</Text>
      <Card pad={6}>
        <PressableScale onPress={onOpenReport}>
          <View style={[styles.toolRow, styles.toolDivider]}>
            <View style={styles.toolGlyph}>
              <Icon name="share" size={21} color={TOKENS.balance} sw={1.9} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.toolLabel}>Export report for doctor</Text>
              <Text style={styles.toolSub}>PDF summary of flares & meds</Text>
            </View>
            <Icon name="chevR" size={18} color={TOKENS.grey} sw={2} />
          </View>
        </PressableScale>
        <PressableScale onPress={onOpenSettings}>
          <View style={styles.toolRow}>
            <View style={styles.toolGlyph}>
              <Icon name="settings" size={21} color={TOKENS.balance} sw={1.9} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.toolLabel}>Settings</Text>
              <Text style={styles.toolSub}>Temperature unit & preferences</Text>
            </View>
            <Icon name="chevR" size={18} color={TOKENS.grey} sw={2} />
          </View>
        </PressableScale>
      </Card>

      <Text style={styles.syncCaption}>{lastSyncedLabel(lastSyncedAt)}</Text>

      <PressableScale onPress={onSignOut} style={styles.signOutBtn}>
        <Icon name="share" size={18} color={TOKENS.balance} sw={2} />
        <Text style={styles.signOutText}>Sign out</Text>
      </PressableScale>

      <PressableScale onPress={onDeleteAccount} style={styles.deleteBtn}>
        <Icon name="trash" size={19} color="#E1542E" sw={1.9} />
        <Text style={styles.deleteText}>Delete my account</Text>
      </PressableScale>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TOKENS.canvas },
  content: { padding: 20, paddingBottom: 120 },
  heading: {
    fontSize: 28,
    fontFamily: "Sora_700Bold",
    color: TOKENS.anchor,
    letterSpacing: -0.6,
    marginBottom: 14,
  },
  peopleList: { gap: 10, marginBottom: 22 },
  personRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  personActive: { borderWidth: 2, borderColor: TOKENS.yellow },
  personIdle: { borderWidth: 2, borderColor: "transparent" },
  personMeta: { flex: 1, minWidth: 0 },
  personNameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  personName: { fontSize: 16, fontFamily: "Sora_700Bold", color: TOKENS.anchor, flexShrink: 1 },
  badge: { backgroundColor: TOKENS.yellow, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10.5, fontFamily: "Sora_700Bold", color: TOKENS.anchor },
  personSub: { fontSize: 13, color: TOKENS.grey, marginTop: 1 },
  roundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TOKENS.calm,
    alignItems: "center",
    justifyContent: "center",
  },
  roundBtnBare: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 15,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: TOKENS.lavender,
  },
  addGlyph: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: TOKENS.calm,
    alignItems: "center",
    justifyContent: "center",
  },
  addLabel: { fontSize: 15.5, fontFamily: "Sora_600SemiBold", color: TOKENS.balance },
  sectionHeader: {
    fontSize: 13,
    fontFamily: "Sora_700Bold",
    color: TOKENS.grey,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingLeft: 4,
  },
  toolRow: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 13, paddingHorizontal: 12 },
  toolDivider: { borderBottomWidth: 1, borderBottomColor: TOKENS.calm },
  toolGlyph: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: TOKENS.calm,
    alignItems: "center",
    justifyContent: "center",
  },
  toolLabel: { fontSize: 15.5, fontFamily: "Sora_600SemiBold", color: TOKENS.anchor },
  toolSub: { fontSize: 12.5, color: TOKENS.grey },
  syncCaption: { fontSize: 12.5, color: TOKENS.grey, textAlign: "center", marginTop: 14 },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: TOKENS.white,
    borderWidth: 1.5,
    borderColor: TOKENS.lavender,
  },
  signOutText: { fontSize: 15, fontFamily: "Sora_700Bold", color: TOKENS.balance },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#FCE9E2",
  },
  deleteText: { fontSize: 15, fontFamily: "Sora_700Bold", color: "#E1542E" },
});
