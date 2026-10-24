import { ScrollView, Text, View } from "react-native";
import { Store } from "../domain/models";
import {
  average,
  best,
  bestPossibleAo5,
  formatTime,
  formatAverage,
} from "../domain/statistics";
import { Stat } from "./common";
import { color, ui } from "./theme";
export function Progress({ store }: { store: Store }) {
  const session =
    store.sessions.find((s) => s.id === store.activeSessionId) ??
    store.sessions[0];
  return (
    <ScrollView contentContainerStyle={ui.page}>
      <Text style={ui.title}>Progress</Text>
      <Text style={[ui.subtitle, { marginTop: 8, marginBottom: 24 }]}>
        {session.name} · every solve counts.
      </Text>
      <View style={[ui.card, ui.grid]}>
        <Stat label="BEST SINGLE" value={formatTime(best(session.solves))} />
        <Stat label="SOLVE COUNT" value={String(session.solves.length)} />
        {[3, 5, 12, 100].map((n) => (
          <Stat
            key={n}
            label={n === 3 ? "MO3" : `AO${n}`}
            value={formatAverage(average(session.solves, n))}
          />
        ))}
        {session.solves.length >= 4 && (
          <Stat
            label="BPAo5"
            value={formatAverage(bestPossibleAo5(session.solves))}
          />
        )}
      </View>
      <Text style={ui.label}>YOUR REPERTOIRE</Text>
      {(["OLL", "PLL"] as const).map((t) => {
        const count = store.cases.filter(
            (c) => c.type === t && store.learned.includes(c.id),
          ).length,
          total = t === "OLL" ? 57 : 21;
        return (
          <View key={t} style={ui.card}>
            <View style={ui.between}>
              <Text style={ui.text}>{t} learned</Text>
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
      })}
      <Text style={[ui.label, { marginTop: 14 }]}>SESSION MILESTONES</Text>
      <View style={ui.grid}>
        {[30, 20, 15, 12, 10].map((n) => (
          <Milestone
            key={n}
            label={`Sub-${n}`}
            unlocked={!!store.achievements[`${session.id}:sub-${n}`]}
          />
        ))}
        {[100, 200, 500, 1000, 2000, 5000, 10000].map((n) => (
          <Milestone
            key={n}
            label={`${n.toLocaleString()} solves`}
            unlocked={!!store.achievements[`${session.id}:solves-${n}`]}
          />
        ))}
      </View>
      <Text style={[ui.label, { marginTop: 20 }]}>ALGORITHM MILESTONES</Text>
      <View style={ui.grid}>
        {["2-look-OLL", "2-look-PLL", "full-PLL", "full-OLL"].map((k) => (
          <Milestone
            key={k}
            label={k.replaceAll("-", " ")}
            unlocked={!!store.achievements[`global:${k}`]}
          />
        ))}
      </View>
      <Text style={[ui.label, { marginTop: 20 }]}>TRAINING PERSONAL BESTS</Text>
      {store.cases
        .filter((c) => store.attempts.some((a) => a.caseId === c.id))
        .map((c) => (
          <View key={c.id} style={ui.card}>
            <Text style={ui.text}>{c.name}</Text>
            <Text style={ui.subtitle}>
              Execution{" "}
              {formatTime(
                best(
                  store.attempts.filter(
                    (a) => a.caseId === c.id && a.mode === "execution",
                  ),
                ),
              )}
            </Text>
            <Text style={ui.subtitle}>
              Recognition · full{" "}
              {formatTime(
                best(
                  store.attempts.filter(
                    (a) => a.caseId === c.id && a.mode === "full" && a.correct,
                  ),
                ),
              )}
            </Text>
            <Text style={ui.subtitle}>
              Recognition · two-sided{" "}
              {formatTime(
                best(
                  store.attempts.filter(
                    (a) =>
                      a.caseId === c.id && a.mode === "two-sided" && a.correct,
                  ),
                ),
              )}
            </Text>
          </View>
        ))}
      {!store.attempts.length && (
        <Text style={ui.subtitle}>
          Your training PBs will appear here after your first attempt.
        </Text>
      )}
    </ScrollView>
  );
}
function Milestone({ label, unlocked }: { label: string; unlocked: boolean }) {
  return (
    <View style={[ui.chip, { width: "47%", opacity: unlocked ? 1 : 0.55 }]}>
      <Text style={ui.text}>
        {unlocked ? "✓" : "○"} {label}
      </Text>
    </View>
  );
}
