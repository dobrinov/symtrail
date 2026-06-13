// Tabs shell — wraps the four app routes in a custom design-kit TabBar and
// hosts the LogSheetProvider so the raised "+" button can open the log flow.
import React from "react";
import { Tabs } from "expo-router";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { TabBar } from "../../design/TabBar";
import { LogSheetProvider, useLogSheet } from "../../state/LogSheetContext";

// route name (expo-router) → TabBar key
const ROUTE_TO_TAB: Record<string, string> = {
  index: "today",
  calendar: "calendar",
  meds: "meds",
  profile: "profile",
};
const TAB_TO_ROUTE: Record<string, string> = {
  today: "index",
  calendar: "calendar",
  meds: "meds",
  profile: "profile",
};

function AppTabBar(props: BottomTabBarProps): React.JSX.Element {
  const { openLog } = useLogSheet();
  const current = props.state.routes[props.state.index]?.name ?? "index";
  return (
    <TabBar
      active={ROUTE_TO_TAB[current] ?? "today"}
      onChange={(tab) => {
        const route = TAB_TO_ROUTE[tab];
        if (route) props.navigation.navigate(route);
      }}
      onAdd={() => openLog()}
    />
  );
}

export default function TabsLayout(): React.JSX.Element {
  return (
    <LogSheetProvider>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <AppTabBar {...props} />}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="calendar" />
        <Tabs.Screen name="meds" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </LogSheetProvider>
  );
}
