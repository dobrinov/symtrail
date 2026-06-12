import { render, fireEvent, screen } from "@testing-library/react-native";
import React from "react";
import { Text } from "react-native";
import { Button } from "../../src/design/Button";
import { SeverityChip } from "../../src/design/SeverityChip";
import { Avatar } from "../../src/design/Avatar";
import { Icon } from "../../src/design/Icon";

test("Button fires onPress and renders children", async () => {
  const onPress = jest.fn();
  await render(<Button onPress={onPress}><Text>Save</Text></Button>);
  await fireEvent.press(screen.getByText("Save"));
  expect(onPress).toHaveBeenCalled();
});

test("Button disabled does not fire onPress", async () => {
  const onPress = jest.fn();
  await render(<Button onPress={onPress} disabled><Text>Save</Text></Button>);
  await fireEvent.press(screen.getByText("Save"));
  expect(onPress).not.toHaveBeenCalled();
});

test("SeverityChip shows the severity label", async () => {
  await render(<SeverityChip level="moderate" />);
  expect(screen.getByText("Moderate")).toBeTruthy();
});

test("Avatar derives the initial from the name", async () => {
  await render(<Avatar name="Leo" color="#FEAE2E" size={40} />);
  expect(screen.getByText("L")).toBeTruthy();
});

test("Icon renders a known glyph and falls back gracefully for unknown", async () => {
  await expect(render(<Icon name="fever" size={20} color="#000" />)).resolves.toBeTruthy();
  await expect(render(<Icon name="not-a-glyph" size={20} color="#000" />)).resolves.toBeTruthy();
});
