import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import {
  animationRig,
  projectStickers,
  turnStickers,
} from "../domain/algorithmAnimation";
import { ui } from "./theme";
const palette: Record<string, string> = {
  U: "#ffda67",
  R: "#f3a45c",
  F: "#5bd3aa",
  D: "#f4f5ef",
  L: "#f27c8b",
  B: "#74b5ff",
};
export function AlgorithmAnimation({
  algorithm,
  type,
}: {
  algorithm: string;
  type: "OLL" | "PLL";
}) {
  const rig = useMemo(() => {
    try {
      return animationRig(algorithm, type);
    } catch {
      return null;
    }
  }, [algorithm, type]);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    let request: number;
    const start = performance.now();
    const tick = () => {
      setElapsed(performance.now() - start);
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [rig]);
  if (!rig)
    return (
      <Text style={ui.error}>
        This algorithm contains unsupported move notation.
      </Text>
    );
  const duration = 560,
    lead = 700,
    end = 1300;
  const time =
    elapsed %
    (lead + (rig.turns.length + rig.returnTurns.length) * duration + end);
  const position = Math.max(0, (time - lead) / duration);
  const index = Math.min(rig.turns.length, Math.floor(position));
  const fraction = position - index;
  const eased = fraction * fraction * (3 - 2 * fraction);
  let visibleStickers =
    index < rig.turns.length
      ? turnStickers(rig.frames[index], rig.turns[index], eased)
      : rig.frames[index];
  if (position >= rig.turns.length && rig.returnTurns.length) {
    const returnPosition = position - rig.turns.length;
    const returnIndex = Math.min(
      rig.returnTurns.length,
      Math.floor(returnPosition),
    );
    const progress = returnPosition - returnIndex;
    visibleStickers =
      returnIndex < rig.returnTurns.length
        ? turnStickers(
            rig.returnFrames[returnIndex],
            rig.returnTurns[returnIndex],
            progress * progress * (3 - 2 * progress),
          )
        : rig.returnFrames[returnIndex];
  }
  const stickers = projectStickers(visibleStickers);
  return (
    <View
      pointerEvents="none"
      accessibilityLabel={`${type} hollow cube animation: ${algorithm}`}
      style={{ alignItems: "center", paddingVertical: 10 }}
    >
      <Svg width="100%" height={240} viewBox="-140 -125 280 250">
        {stickers.map((s) => (
          <Polygon
            key={s.id}
            points={s.points}
            fill={
              s.backFacing ? "#222c39" : s.muted ? "#344050" : palette[s.color]
            }
            stroke={s.backFacing || s.muted ? "none" : "#111c29"}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
        ))}
      </Svg>
      <Text style={[ui.text, { textAlign: "center", lineHeight: 26 }]}>
        {rig.turns.map((t, i) => (
          <Text
            key={i}
            style={
              i === index && time >= lead
                ? {
                    color: "#162231",
                    backgroundColor: palette.U,
                    fontWeight: "700",
                  }
                : undefined
            }
          >
            {t.token}{" "}
          </Text>
        ))}
      </Text>
      <Text style={[ui.badge, { marginTop: 8 }]}>
        {time < lead
          ? "Starting position"
          : index === rig.turns.length
            ? "Complete · replaying"
            : `Move ${index + 1} of ${rig.turns.length}`}{" "}
        · tap outside to close
      </Text>
    </View>
  );
}
