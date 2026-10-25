import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsiveLayout } from "./responsive";
import { useMemo, useRef } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Animated,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { ui, color } from "./theme";
import { AchievementBanner } from "./Achievements";
export function Button({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={[ui.button, disabled && { opacity: 0.4 }]}
    >
      <Text style={ui.buttonText}>{title}</Text>
    </Pressable>
  );
}
export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={12}
      onTouchEnd={(event) => event.stopPropagation()}
      onPress={onPress}
      style={[
        ui.button,
        {
          alignSelf: "flex-start",
          flexDirection: "row",
          gap: 8,
          minHeight: 48,
          paddingVertical: 8,
          borderWidth: 1,
          borderColor: color.accent,
        },
      ]}
    >
      <Text style={[ui.buttonText, { fontSize: 26 }]}>‹</Text>
      <Text style={[ui.label, { marginBottom: 0, fontSize: 14 }]}>Back</Text>
    </Pressable>
  );
}
export function Sheet({
  overlay,
  closeLabel = "Cancel",
  title,
  children,
  onClose,
}: {
  title: string;
  closeLabel?: string;
  overlay?: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const layout = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const scrollAtTop = useRef(true);
  const dragStartedAtTop = useRef(false);
  const dismissing = useRef(false);
  const sheetY = useRef(new Animated.Value(0)).current;
  const dismiss = () => {
    if (dismissing.current) return;
    dismissing.current = true;
    Animated.timing(sheetY, {
      toValue: 700,
      duration: 180,
      useNativeDriver: true,
    }).start(onClose);
  };
  const pull = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_event, gesture) =>
          scrollAtTop.current &&
          gesture.dy > 12 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_event, gesture) => {
          sheetY.setValue(Math.max(0, gesture.dy));
        },
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dy > 60 || gesture.vy > 0.5) {
            dismiss();
          } else {
            Animated.spring(sheetY, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () =>
          Animated.spring(sheetY, {
            toValue: 0,
            useNativeDriver: true,
          }).start(),
        onPanResponderTerminationRequest: () => false,
      }),
    [onClose, sheetY],
  );
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          backgroundColor: "#00000088",
          justifyContent: layout.wide ? "center" : "flex-end",
          paddingTop: insets.top,
          paddingHorizontal: layout.wide ? 32 : 0,
          paddingBottom: layout.wide ? Math.max(24, insets.bottom) : 0,
        }}
      >
        <Pressable
          accessibilityLabel="Close dialog"
          style={
            layout.wide
              ? { position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }
              : { flex: 1 }
          }
          onPress={onClose}
        />
        <Animated.View
          {...pull.panHandlers}
          style={{
            backgroundColor: color.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: layout.padding,
            paddingBottom: layout.padding + (layout.wide ? 0 : insets.bottom),
            borderRadius: layout.wide ? 28 : undefined,
            maxHeight: "88%",
            width: "100%",
            maxWidth: 760,
            alignSelf: "center",
            transform: [{ translateY: sheetY }],
          }}
        >
          <View style={[ui.between, { marginBottom: 22 }]}>
            <Text style={[ui.title, { fontSize: 22, flexShrink: 1 }]}>
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              style={{
                minHeight: 44,
                justifyContent: "center",
                paddingHorizontal: 8,
              }}
            >
              <Text style={ui.badge}>{closeLabel}</Text>
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={(event) => {
              const offset = event.nativeEvent.contentOffset.y;
              scrollAtTop.current = offset <= 1;
              // iOS may give the ScrollView the gesture before PanResponder
              // can capture it. Handle that first pull through its bounce too.
              if (dragStartedAtTop.current && offset < -60) dismiss();
            }}
            onScrollBeginDrag={(event) => {
              scrollAtTop.current = event.nativeEvent.contentOffset.y <= 1;
              dragStartedAtTop.current = scrollAtTop.current;
            }}
            onScrollEndDrag={() => {
              dragStartedAtTop.current = false;
            }}
            scrollEventThrottle={16}
          >
            {children}
          </ScrollView>
        </Animated.View>
        {overlay}
        <AchievementBanner />
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: "48%", paddingVertical: 16 }}>
      <Text style={{ fontFamily: "Digital", fontSize: 28, color: color.ink }}>
        {value}
      </Text>
      <Text style={[ui.label, { marginTop: 8, marginBottom: 0 }]}>{label}</Text>
    </View>
  );
}
