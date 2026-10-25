import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AchievementBanner as Banner,
  RecordScroll,
  recordLabel,
} from "../domain/achievements";
import { formatAverage, formatTime } from "../domain/statistics";
import { color } from "./theme";

const BannerContext = createContext<{
  banner?: Banner;
  paused: boolean;
  dismiss: (id: string) => void;
}>({ paused: false, dismiss: () => {} });

export function AchievementProvider({
  children,
  ...value
}: {
  children: ReactNode;
  banner?: Banner;
  paused: boolean;
  dismiss: (id: string) => void;
}) {
  return (
    <BannerContext.Provider value={value}>{children}</BannerContext.Provider>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduced(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}

// Sheets host the same banner inside their native modal so it stays visible there.
export function AchievementBanner() {
  const { banner, paused, dismiss } = useContext(BannerContext);
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const y = useRef(new Animated.Value(-8)).current;
  useEffect(() => {
    if (!banner || paused) return;
    y.setValue(reduced ? 0 : -8);
    const animation = Animated.timing(y, {
      toValue: 0,
      duration: reduced ? 0 : 240,
      useNativeDriver: true,
    });
    animation.start();
    const timeout = setTimeout(() => dismiss(banner.id), 4500);
    return () => {
      animation.stop();
      clearTimeout(timeout);
    };
  }, [banner?.id, paused, dismiss, reduced, y]);
  if (!banner || paused) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        // Absolute children do not inherit the host's safe-area padding.
        top: insets.top + 12,
        left: insets.left + 16,
        right: insets.right + 16,
        zIndex: 100,
        alignItems: "center",
      }}
    >
      <Animated.View
        style={{ transform: [{ translateY: y }], width: "100%", maxWidth: 480 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${banner.text}. Dismiss notification`}
          accessibilityLiveRegion="polite"
          onPress={() => dismiss(banner.id)}
          style={{
            backgroundColor: color.surface,
            borderColor: color.accent,
            borderWidth: 1,
            borderRadius: 16,
            paddingHorizontal: 20,
            paddingVertical: 17,
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 10,
          }}
        >
          <Text
            style={{
              color: "#ffffff",
              fontFamily: "Inter",
              fontSize: 14,
              textAlign: "center",
            }}
          >
            {banner.text}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export function RecordTicker({
  record,
  onComplete,
}: {
  record: RecordScroll;
  onComplete: (id: string) => void;
}) {
  const reduced = useReducedMotion();
  const x = useRef(new Animated.Value(10000)).current;
  const [width, setWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const text = record.records
    .map(
      ({ window, timeMs }) =>
        `New ${recordLabel(window)} best · ${window === 1 ? formatTime(timeMs) : formatAverage(timeMs)}`,
    )
    .join("     •     ");
  useEffect(() => {
    if (reduced) {
      const timeout = setTimeout(() => onComplete(record.id), 6000);
      return () => clearTimeout(timeout);
    }
    if (!width || !textWidth) return;
    x.setValue(width);
    const animation = Animated.timing(x, {
      toValue: -textWidth,
      duration: Math.max(1500, ((width + textWidth) / 300) * 1000),
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) onComplete(record.id);
    });
    return () => animation.stop();
  }, [record.id, text, width, textWidth, reduced, onComplete, x]);
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityLabel={text}
      pointerEvents="none"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: 44, overflow: "hidden", justifyContent: "center" }}
    >
      {reduced ? (
        <Text
          numberOfLines={1}
          style={{
            fontFamily: "Inter",
            fontSize: 32,
            lineHeight: 40,
            color: "#ffffff",
            textAlign: "center",
          }}
        >
          {text}
        </Text>
      ) : (
        <ScrollView
          horizontal
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ alignItems: "center" }}
        >
          <Animated.View
            onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
            style={{ transform: [{ translateX: x }] }}
          >
            <Text
              numberOfLines={1}
              style={{
                fontFamily: "Inter",
                fontSize: 32,
                lineHeight: 40,
                color: "#ffffff",
              }}
            >
              {text}
            </Text>
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}
