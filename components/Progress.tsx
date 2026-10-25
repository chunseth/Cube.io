import { useMemo, useState } from "react";
import { useResponsiveLayout } from "./responsive";
import { Pressable, ScrollView, Text, View } from "react-native";
import Svg, {
  Circle,
  G,
  Line,
  Polyline,
  Text as SvgText,
} from "react-native-svg";
import { Store } from "../domain/models";
import { formatTime, formatAverage, resultMs } from "../domain/statistics";
import {
  practiceSingleRecords,
  rollingAverageSeries,
  solveAxisTicks,
  bestAverageRecord,
  AverageRecord,
} from "../domain/progress";
import { CaseImage } from "./CubePreview";
import { ProgressDetails } from "./ProgressDetails";
import { color, ui } from "./theme";
export function Progress({ store }: { store: Store }) {
  const layout = useResponsiveLayout();
  const session =
    store.sessions.find((s) => s.id === store.activeSessionId) ??
    store.sessions[0];
  const [selected, setSelected] = useState<{
    sessionId: string;
    window: number;
  } | null>(null);
  const averages = useMemo(
    () =>
      [3, 5, 12, 100].map((window) => ({
        window,
        record: bestAverageRecord(session.solves, window),
      })),
    [session.solves],
  );
  const { bestSingle, worstSingle } = practiceSingleRecords(session.solves);
  const singleRecord: AverageRecord | null = bestSingle
    ? {
        value: resultMs(bestSingle),
        entries: [{ solve: bestSingle, solveNumber: 0, excluded: false }],
      }
    : null;
  const selectedRecord =
    selected?.sessionId === session.id
      ? selected.window === 1
        ? singleRecord
        : averages.find((a) => a.window === selected.window)?.record
      : null;
  const details =
    selectedRecord && selected ? (
      <ProgressDetails
        record={selectedRecord}
        window={selected.window}
        practice={
          session.id === "oll-practice" || session.id === "pll-practice"
        }
        onClose={() => setSelected(null)}
      />
    ) : null;
  if (session.id === "oll-practice" || session.id === "pll-practice") {
    return (
      <>
        <ScrollView
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[ui.page, layout.page]}
        >
          <Text style={ui.title}>Progress</Text>
          <Text style={[ui.subtitle, { marginTop: 8, marginBottom: 24 }]}>
            {session.name}
          </Text>
          <View
            style={{
              flexDirection: layout.wide ? "row" : "column",
              gap: 14,
              marginBottom: 24,
            }}
          >
            {[
              { label: "BEST SINGLE", solve: bestSingle },
              ...(session.solves.length > 1
                ? [{ label: "WORST SINGLE", solve: worstSingle }]
                : []),
            ].map(({ label, solve }) => (
              <Pressable
                key={label}
                accessibilityRole="button"
                accessibilityLabel={`View ${label.toLowerCase()} scramble`}
                disabled={label !== "BEST SINGLE" || !solve}
                onPress={() =>
                  setSelected({ sessionId: session.id, window: 1 })
                }
                style={[
                  ui.card,
                  { flex: 1, alignItems: "center", marginBottom: 0 },
                ]}
              >
                <Text style={ui.label}>{label}</Text>
                <Text
                  style={{
                    fontFamily: "Digital",
                    fontSize: 42,
                    color: color.ink,
                    marginBottom: 20,
                  }}
                >
                  {formatTime(solve ? resultMs(solve) : null)}
                </Text>
                <CaseImage
                  setup={solve?.scramble ?? ""}
                  oll={session.id === "oll-practice"}
                  size={176}
                />
              </Pressable>
            ))}
          </View>
          <LearnedProgress
            store={store}
            type={session.id === "oll-practice" ? "OLL" : "PLL"}
          />
        </ScrollView>
        {details}
      </>
    );
  }
  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[ui.page, layout.page]}
      >
        <Text style={ui.title}>Progress</Text>
        <Text style={[ui.subtitle, { marginTop: 8, marginBottom: 24 }]}>
          {session.name}
        </Text>
        <Text style={ui.label}>BEST</Text>
        <View style={[ui.card, ui.grid]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View Best Single scramble"
            disabled={!singleRecord}
            onPress={() => setSelected({ sessionId: session.id, window: 1 })}
            style={{
              width: "100%",
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: color.line,
              marginBottom: 6,
            }}
          >
            <Text
              style={{ fontFamily: "Digital", fontSize: 48, color: color.ink }}
            >
              {formatTime(singleRecord?.value ?? null)}
            </Text>
            <Text style={[ui.label, { marginTop: 8, marginBottom: 0 }]}>
              BEST SINGLE
            </Text>
          </Pressable>
          {averages.map(({ window, record }) => (
            <Pressable
              key={window}
              accessibilityRole="button"
              accessibilityLabel={`View Best ${window === 3 ? "Mo3" : `Ao${window}`} details`}
              disabled={!record}
              onPress={() => setSelected({ sessionId: session.id, window })}
              style={{ width: "48%", paddingVertical: 16 }}
            >
              <Text
                style={{
                  fontFamily: "Digital",
                  fontSize: 28,
                  color: color.ink,
                }}
              >
                {formatAverage(record?.value ?? null)}
              </Text>
              <Text style={[ui.label, { marginTop: 8, marginBottom: 0 }]}>
                {window === 3 ? "BEST MO3" : `BEST AO${window}`}
              </Text>
            </Pressable>
          ))}
        </View>
        <AverageChart solves={session.solves} />
        <Text style={ui.label}>YOUR REPERTOIRE</Text>
        <LearnedProgress store={store} type="OLL" />
        <LearnedProgress store={store} type="PLL" />
      </ScrollView>
      {details}
    </>
  );
}
function LearnedProgress({
  store,
  type,
}: {
  store: Store;
  type: "OLL" | "PLL";
}) {
  const count = store.cases.filter(
    (c) => c.type === type && store.learned.includes(c.id),
  ).length;
  const total = type === "OLL" ? 57 : 21;
  return (
    <View style={ui.card}>
      <View style={ui.between}>
        <Text style={ui.text}>{type} learned</Text>
        <Text style={ui.badge}>
          {count}/{total} · {Math.round((count / total) * 100)}%
        </Text>
      </View>
      <View
        style={{
          height: 5,
          backgroundColor: color.blue,
          borderRadius: 3,
          marginTop: 16,
        }}
      >
        <View
          style={{
            height: 5,
            width: `${(count / total) * 100}%`,
            backgroundColor: color.accent,
            borderRadius: 3,
          }}
        />
      </View>
    </View>
  );
}
const averageLineStyles = [
  { window: 5, label: "Ao5", color: color.accent, width: 3 },
  { window: 12, label: "Ao12", color: "#ffffff", width: 2 },
  { window: 100, label: "Ao100", color: "#ff64d8", width: 2 },
];
function AverageChart({
  solves,
}: {
  solves: Store["sessions"][number]["solves"];
}) {
  const [width, setWidth] = useState(300);
  const [hiddenAverages, setHiddenAverages] = useState<number[]>([]);
  const lines = averageLineStyles.map((style) => ({
    ...style,
    values: rollingAverageSeries(solves, style.window),
  }));
  const all = lines.flatMap((line) =>
    line.values.flatMap((point) =>
      point.timeMs === null ? [] : [point.timeMs],
    ),
  );
  const min = all.length ? Math.min(...all) : 0;
  const max = all.length ? Math.max(...all) : 10000;
  const padding = Math.max((max - min) * 0.1, 500);
  const low = Math.max(0, Math.floor((min - padding) / 1000) * 1000);
  const yStep = Math.max(1000, Math.ceil((max + padding - low) / 4000) * 1000);
  const high = low + Math.ceil((max + padding - low) / yStep) * yStep;
  const lastSolve = Math.max(5, solves.length);
  const yTicks = Array.from(
    { length: Math.round((high - low) / yStep) + 1 },
    (_, i) => {
      const time = low + yStep * i;
      return { time, label: formatTime(time).replace(/\.\d+$/, "") };
    },
  );
  const left = Math.max(...yTicks.map(({ label }) => label.length)) * 7 + 6,
    right = width - 14,
    top = 12,
    bottom = 196;
  const x = (solveNumber: number) =>
    left + ((solveNumber - 5) / Math.max(lastSolve - 5, 1)) * (right - left);
  const y = (time: number) =>
    bottom - ((time - low) / (high - low)) * (bottom - top);
  const xTicks = solveAxisTicks(lastSolve, right - left);
  return (
    <View style={ui.card}>
      <Text style={ui.label}>AVERAGE PROGRESS</Text>
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        accessibilityLabel="Rolling average times by number of solves, from oldest to newest"
      >
        <Svg width="100%" height={230} viewBox={`0 0 ${width} 230`}>
          {yTicks.map(({ time, label }) => {
            return (
              <G key={time}>
                <Line
                  x1={left}
                  x2={right}
                  y1={y(time)}
                  y2={y(time)}
                  stroke={color.line}
                  strokeWidth={1}
                />
                <SvgText
                  x={left - 6}
                  y={y(time) + 4}
                  fill={color.muted}
                  fontSize={11}
                  textAnchor="end"
                >
                  {label}
                </SvgText>
              </G>
            );
          })}
          <Line
            x1={left}
            x2={left}
            y1={top}
            y2={bottom}
            stroke={color.muted}
            strokeWidth={1}
          />
          <Line
            x1={left}
            x2={right}
            y1={bottom}
            y2={bottom}
            stroke={color.muted}
            strokeWidth={1}
          />
          {xTicks.map((tick) => (
            <G key={tick}>
              <Line
                x1={x(tick)}
                x2={x(tick)}
                y1={bottom}
                y2={bottom + 5}
                stroke={color.muted}
                strokeWidth={1}
              />
              <SvgText
                x={x(tick)}
                y={bottom + 22}
                fill={color.muted}
                fontSize={11}
                textAnchor={tick === lastSolve ? "end" : "middle"}
              >
                {tick}
              </SvgText>
            </G>
          ))}
          {lines.map((line) => {
            if (hiddenAverages.includes(line.window)) return null;
            const segments: { solveNumber: number; timeMs: number }[][] = [[]];
            for (const point of line.values) {
              if (point.timeMs === null) segments.push([]);
              else
                segments[segments.length - 1].push({
                  ...point,
                  timeMs: point.timeMs,
                });
            }
            return segments.map((segment, index) =>
              segment.length === 1 ? (
                <Circle
                  key={`${line.window}-${index}`}
                  cx={x(segment[0].solveNumber)}
                  cy={y(segment[0].timeMs)}
                  r={line.width}
                  fill={line.color}
                />
              ) : segment.length > 1 ? (
                <Polyline
                  key={`${line.window}-${index}`}
                  points={segment
                    .map(
                      (point) => `${x(point.solveNumber)},${y(point.timeMs)}`,
                    )
                    .join(" ")}
                  fill="none"
                  stroke={line.color}
                  strokeWidth={line.width}
                  strokeLinejoin="round"
                />
              ) : null,
            );
          })}
        </Svg>
      </View>
      <View style={[ui.row, { justifyContent: "center", columnGap: 22 }]}>
        {averageLineStyles.map((line) => (
          <Pressable
            key={line.window}
            accessibilityRole="button"
            accessibilityLabel={`${hiddenAverages.includes(line.window) ? "Show" : "Hide"} ${line.label}`}
            accessibilityState={{
              selected: !hiddenAverages.includes(line.window),
            }}
            onPress={() =>
              setHiddenAverages((hidden) =>
                hidden.includes(line.window)
                  ? hidden.filter((window) => window !== line.window)
                  : [...hidden, line.window],
              )
            }
            style={({ pressed }) => [
              ui.row,
              {
                gap: 7,
                minHeight: 44,
                paddingHorizontal: 4,
                opacity: hiddenAverages.includes(line.window)
                  ? 0.4
                  : pressed
                    ? 0.7
                    : 1,
              },
            ]}
          >
            <Svg width={32} height={12}>
              <Line
                x1={0}
                x2={32}
                y1={6}
                y2={6}
                stroke={line.color}
                strokeWidth={line.width}
              />
            </Svg>
            <Text style={[ui.subtitle, { fontSize: 12 }]}>{line.label}</Text>
          </Pressable>
        ))}
      </View>
      {!all.length && (
        <Text style={[ui.subtitle, { marginTop: 16 }]}>
          {solves.length < 5
            ? "Complete five solves to start your average trend."
            : "No completed averages to plot yet."}
        </Text>
      )}
    </View>
  );
}
