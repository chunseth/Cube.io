import { useEffect, useMemo, useState, useRef } from "react";
import { Text, View, PanResponder, ViewStyle } from "react-native";
import Cube from "../vendor/cubejs";
import Svg, { Polygon, Rect, SvgXml } from "react-native-svg";
import { caseDiagramSVG } from "../domain/caseDiagram";
import { canonicalCube } from "../domain/lastLayer";
import { projectCube, projectRecognitionCube } from "../domain/cubeProjection";
import { ui } from "./theme";
const colors: Record<string, string> = {
  U: "#f4d45b",
  R: "#e7a75f",
  F: "#61a88b",
  D: "#fbfbf4",
  L: "#d96568",
  B: "#709fc4",
};
const scrambleColors: Record<string, string> = {
  ...colors,
  U: colors.D,
  D: colors.U,
  R: colors.L,
  L: colors.R,
};
export function cubeState(notation: string) {
  try {
    return new Cube().move(notation).asString();
  } catch {
    return null;
  }
}
export function CaseImage({
  setup,
  size = 104,
  oll = true,
  imageId,
}: {
  setup: string;
  size?: number;
  oll?: boolean;
  imageId?: string;
}) {
  const state = useMemo(() => {
    try {
      return setup ? canonicalCube(setup).asString() : null;
    } catch {
      return null;
    }
  }, [setup]);
  const xml = useMemo(
    () => caseDiagramSVG(state, oll, imageId),
    [state, oll, imageId],
  );
  return (
    <View
      accessibilityLabel={`${oll ? "OLL orientation" : "PLL permutation"} diagram: U face with B above, F below, L left and R right; all four side rows visible`}
      style={{ width: size, height: size }}
    >
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
}
export function OllQuestion({
  setup,
  size = 252,
}: {
  setup: string;
  size?: number;
}) {
  return <RotatingRecognitionCube setup={setup} oll size={size} fixedView />;
}
export function PllQuestion({
  setup,
  size = 252,
}: {
  setup: string;
  size?: number;
}) {
  return (
    <RotatingRecognitionCube setup={setup} oll={false} size={size} fixedView />
  );
}

export function CubePreview({
  notation,
  locked = false,
  oll = false,
  whiteTop = false,
  size = 290,
  showControls = true,
  onInteractionChange,
}: {
  notation: string;
  locked?: boolean;
  oll?: boolean;
  whiteTop?: boolean;
  size?: number;
  showControls?: boolean;
  onInteractionChange?: (active: boolean) => void;
}) {
  const palette = whiteTop ? scrambleColors : colors;
  const [yaw, setYaw] = useState(45);
  const yawRef = useRef(yaw);
  yawRef.current = yaw;
  const dragStart = useRef(45);
  const drag = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !locked,
        onPanResponderTerminationRequest: () => false,
        onMoveShouldSetPanResponder: (_e, g) =>
          !locked && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderGrant: () => {
          dragStart.current = yawRef.current;
        },
        onPanResponderMove: (_e, g) => {
          if (!locked) setYaw(dragStart.current - g.dx * 0.6);
        },
      }),
    [locked],
  );
  const state = useMemo(() => cubeState(notation), [notation]);
  const stickers = useMemo(
    () => (state ? projectCube(state, locked ? 45 : yaw) : []),
    [state, yaw, locked],
  );
  if (!state)
    return <Text style={ui.error}>This case needs a valid cube setup.</Text>;
  return (
    <View
      style={{ alignItems: "center", paddingVertical: showControls ? 12 : 0 }}
    >
      <View
        {...drag.panHandlers}
        onTouchStart={() => !locked && onInteractionChange?.(true)}
        onTouchEnd={() => onInteractionChange?.(false)}
        onTouchCancel={() => onInteractionChange?.(false)}
        accessibilityLabel="Cube showing up and two side faces"
        style={
          {
            width: size,
            height: (size * 280) / 290,
            touchAction: "none",
          } as ViewStyle
        }
      >
        <Svg
          width={size}
          height={(size * 280) / 290}
          viewBox="-145 -140 290 280"
        >
          {stickers.map((s) => (
            <Polygon
              key={s.id}
              points={s.points}
              fill={oll && s.color !== "U" ? "#acbbc6" : palette[s.color]}
              stroke="#23313e"
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      </View>
    </View>
  );
}

// Standard unfolded net: U above F; L F R B across; D below F.
export function CubeNet({
  notation,
  whiteTop = true,
  size = 240,
}: {
  notation: string;
  whiteTop?: boolean;
  size?: number;
}) {
  const state = useMemo(() => cubeState(notation), [notation]);
  const palette = whiteTop ? scrambleColors : colors;
  if (!state)
    return <Text style={ui.error}>This case needs a valid cube setup.</Text>;
  const faces = [
    { face: 0, x: 1, y: 0 },
    { face: 4, x: 0, y: 1 },
    { face: 2, x: 1, y: 1 },
    { face: 1, x: 2, y: 1 },
    { face: 5, x: 3, y: 1 },
    { face: 3, x: 1, y: 2 },
  ];
  return (
    <View
      accessibilityLabel={
        whiteTop
          ? "Unfolded cube: white above green; orange, green, red, blue across; yellow below green"
          : "Unfolded cube: yellow above green; red, green, orange, blue across; white below green"
      }
      style={{ width: size, height: (size * 94) / 126 }}
    >
      <Svg width={size} height={(size * 94) / 126} viewBox="0 0 126 94">
        {faces.flatMap(({ face, x, y }) =>
          Array.from({ length: 9 }, (_, i) => (
            <Rect
              key={face * 9 + i}
              x={x * 32 + (i % 3) * 10 + 0.4}
              y={y * 32 + Math.floor(i / 3) * 10 + 0.4}
              width={9.2}
              height={9.2}
              rx={0.6}
              fill={palette[state[face * 9 + i]]}
              stroke="#07101a"
              strokeWidth={0.8}
            />
          )),
        )}
      </Svg>
    </View>
  );
}

export function RotatingRecognitionCube({
  setup,
  oll,
  size = 252,
  autoRotate = false,
  fixedView = false,
}: {
  setup: string;
  oll: boolean;
  size?: number;
  autoRotate?: boolean;
  fixedView?: boolean;
}) {
  const [yaw, setYaw] = useState(45);
  useEffect(() => {
    if (!autoRotate) return;
    const start = performance.now();
    setYaw(45);
    const timer = setInterval(
      () => setYaw(45 + (((performance.now() - start) * 0.018) % 360)),
      32,
    );
    return () => clearInterval(timer);
  }, [autoRotate, setup]);
  const yawRef = useRef(yaw);
  yawRef.current = yaw;
  const dragStart = useRef(45);
  const drag = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 6 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: () => {
          dragStart.current = yawRef.current;
        },
        onPanResponderMove: (_event, gesture) =>
          setYaw(dragStart.current - gesture.dx * 0.65),
      }),
    [],
  );
  const state = useMemo(() => canonicalCube(setup).asString(), [setup]);
  const stickers = useMemo(
    () => projectRecognitionCube(state, fixedView ? 45 : yaw, oll),
    [state, yaw, oll, fixedView],
  );
  return (
    <View style={{ alignItems: "center" }}>
      <View
        {...(autoRotate || fixedView ? {} : drag.panHandlers)}
        pointerEvents={autoRotate || fixedView ? "none" : "auto"}
        accessibilityLabel={
          fixedView
            ? `${oll ? "OLL" : "PLL"} question: U, F and R faces visible; F2L hidden; fixed view`
            : autoRotate
              ? "Automatically rotating cube: yellow up, showing all four side faces."
              : "Recognition cube: yellow up, two side faces visible. Swipe left or right to inspect all four sides."
        }
        style={
          {
            width: size,
            height: (size * 280) / 290,
            touchAction: "none",
          } as ViewStyle
        }
      >
        <Svg
          width={size}
          height={(size * 280) / 290}
          viewBox="-145 -140 290 280"
        >
          {stickers.map((s) => (
            <Polygon
              key={s.id}
              points={s.points}
              fill={
                s.displayColor === "null" ? "#344050" : colors[s.displayColor]
              }
              stroke={s.displayColor === "null" ? "none" : "#23313e"}
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      </View>
      {!autoRotate && !fixedView && (
        <>
          <Text style={[ui.badge, { marginBottom: 10 }]}>
            Swipe to view all four sides
          </Text>
        </>
      )}
    </View>
  );
}
