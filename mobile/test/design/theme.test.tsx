import React from "react";
import { Text } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { ThemeProvider, themedStyles, useTheme, useTokens } from "../../src/design/theme";
import { DARK, LIGHT } from "../../src/design/tokens";

const useProbeStyles = themedStyles((t) => ({
  probe: { color: t.anchor },
}));

function Probe(): React.JSX.Element {
  const { scheme } = useTheme();
  const tokens = useTokens();
  const styles = useProbeStyles();
  return <Text testID="probe">{`${scheme}|${tokens.white}|${styles.probe.color}`}</Text>;
}

test("dark preference serves the dark palette to hooks and themed styles", async () => {
  await render(
    <ThemeProvider preference="dark">
      <Probe />
    </ThemeProvider>,
  );
  expect(screen.getByTestId("probe").props.children).toBe(`dark|${DARK.white}|${DARK.anchor}`);
});

test("light preference serves the light palette", async () => {
  await render(
    <ThemeProvider preference="light">
      <Probe />
    </ThemeProvider>,
  );
  expect(screen.getByTestId("probe").props.children).toBe(`light|${LIGHT.white}|${LIGHT.anchor}`);
});

test("system preference resolves to light when the OS reports no scheme", async () => {
  // jest's react-native preset has useColorScheme() return null by default.
  await render(
    <ThemeProvider preference="system">
      <Probe />
    </ThemeProvider>,
  );
  expect(screen.getByTestId("probe").props.children).toBe(`light|${LIGHT.white}|${LIGHT.anchor}`);
});

test("components outside a provider fall back to light tokens", async () => {
  await render(<Probe />);
  expect(screen.getByTestId("probe").props.children).toBe(`light|${LIGHT.white}|${LIGHT.anchor}`);
});
