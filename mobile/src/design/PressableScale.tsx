// PressableScale — RN port of the prototype's Pressable wrapper:
// subtle scale (0.97) + opacity (0.85) feedback on press, 120ms ease.
import React, { useRef } from "react";
import { Animated, Pressable, StyleProp, ViewStyle } from "react-native";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableScale({
  onPress,
  disabled = false,
  style,
  children,
}: {
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}): React.JSX.Element {
  const down = useRef(new Animated.Value(0)).current;
  const animate = (toValue: number) =>
    Animated.timing(down, { toValue, duration: 120, useNativeDriver: true }).start();
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => animate(1)}
      onPressOut={() => animate(0)}
      style={[
        style,
        {
          transform: [{ scale: down.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }) }],
        },
        !disabled && {
          opacity: down.interpolate({ inputRange: [0, 1], outputRange: [1, 0.85] }),
        },
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}
