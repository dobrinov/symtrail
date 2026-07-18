// Sheet — bottom sheet modal with slide-up animation, backdrop dismiss,
// drag-handle bar and title row, per docs/prototype/components.jsx.
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "./Icon";
import { PressableScale } from "./PressableScale";
import { themedStyles, useTokens } from "./theme";

export function Sheet({
  open,
  onClose,
  title,
  full = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  full?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  const styles = useStyles();
  const t = useTokens();
  const { height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(open);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      setVisible(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: 340,
        easing: Easing.bezier(0.32, 0.72, 0, 1),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setVisible(false);
      });
    }
  }, [open, progress]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: progress }]} />
        </Pressable>
        <Animated.View
          style={[
            styles.sheet,
            { maxHeight: screenH * (full ? 0.94 : 0.86) },
            {
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [screenH, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <PressableScale onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={18} color={t.balance} sw={2} />
            </PressableScale>
          </View>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: 28 + insets.bottom }]}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const useStyles = themedStyles((t) => StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(12,9,23,0.32)",
  },
  sheet: {
    backgroundColor: t.canvas,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
    // prototype: 0 -10px 40px rgba(12,9,23,0.2)
    shadowColor: "#0C0917", // shadows stay dark in both themes
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -10 },
    elevation: 16,
  },
  handleRow: {
    alignItems: "center",
    paddingTop: 10,
  },
  handle: {
    width: 38,
    height: 5,
    borderRadius: 999,
    backgroundColor: t.lavender,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: 21,
    fontFamily: "Sora_700Bold",
    color: t.anchor,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    flexShrink: 0,
    borderRadius: 16,
    backgroundColor: t.calm,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingTop: 8,
    paddingHorizontal: 20,
  },
}));
