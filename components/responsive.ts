import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Use the available window, including iPad multitasking and rotation. */
export function useResponsiveLayout() {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const width = Math.min(1100, window.width - insets.left - insets.right);
  const wide = width >= 768;
  const padding = width < 360 ? 14 : wide ? 32 : 22;
  const columns = width >= 1000 ? 4 : wide ? 3 : 2;
  return {
    width,
    wide,
    padding,
    columns,
    cardWidth: (width - padding * 2 - (columns - 1) * 10) / columns,
    page: { paddingHorizontal: padding },
  };
}
