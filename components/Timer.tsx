import { Ionicons } from "@expo/vector-icons";
import { DEFAULT_SESSION_NAME } from "../domain/sessions";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  ScrollView,
  useWindowDimensions,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { Attempt, Case, Penalty, Solve, Store, uid } from "../domain/models";
import {
  average,
  best,
  ao5Summary,
  formatTime,
  formatAverage,
  parseTime,
  resultMs,
} from "../domain/statistics";
import { HOLD_MS, inspectionPenalty, TimerPhase } from "../domain/timer/engine";
import {
  generate3x3Scramble,
  getInitial3x3Scramble,
} from "../domain/scrambles/scrambleService";
import { executionSetup } from "../domain/content";
import { Button, Sheet, Stat } from "./common";
import { CubeNet } from "./CubePreview";
import { color, ui } from "./theme";
type Props = {
  store: Store;
  update: (fn: (s: Store) => Store) => void;
  training?: Case;
  onExit: () => void;
  onActive: (v: boolean) => void;
  onSettings: () => void;
};
export function Timer({
  store,
  update,
  training,
  onExit,
  onActive,
  onSettings,
}: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const panelHeight = windowHeight < 750 ? 128 : 148;
  const [cubeWidth, setCubeWidth] = useState(180);
  const session =
    store.sessions.find((s) => s.id === store.activeSessionId) ??
    store.sessions[0];
  const [phase, setPhase] = useState<TimerPhase>("idle");
  const phaseRef = useRef<TimerPhase>("idle");
  const setTimerPhase = (p: TimerPhase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  const [elapsed, setElapsed] = useState(0),
    [inspection, setInspection] = useState(0);
  const [scramble, setScramble] = useState(() =>
    training ? executionSetup(training) : getInitial3x3Scramble(),
  );
  const [error, setError] = useState("");
  const [sheet, setSheet] = useState<
    | "sessions"
    | "session-edit"
    | "stats"
    | "cube"
    | "entry"
    | "actions"
    | "delete"
    | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: "session" | "solve";
    id: string;
    name: string;
  } | null>(null);
  const [name, setName] = useState(""),
    [editId, setEditId] = useState<string | null>(null),
    [entry, setEntry] = useState("");
  const [inputError, setInputError] = useState("");
  const [editSolve, setEditSolve] = useState<string | null>(null);
  const [selectedSolve, setSelectedSolve] = useState<Solve | null>(null);
  const [allowEdit, setAllowEdit] = useState(false);
  const startAt = useRef(0),
    inspectionAt = useRef(0),
    holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inspectionActive = useRef(false),
    penalty = useRef<Penalty>("none"),
    warning = useRef(0),
    suppressRelease = useRef(false);
  const currentScramble = useRef(scramble);
  currentScramble.current = scramble;
  const solves = training
    ? store.attempts.filter(
        (a) => a.caseId === training.id && a.mode === "execution",
      )
    : session.solves;
  const ao5 = ao5Summary(solves, !training && !!session.hasAo5);
  const last = solves[0];
  const cue = useCallback(() => {
    if (store.preferences.haptics)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
        () => {},
      );
  }, [store.preferences.haptics]);
  const nextScramble = () => {
    try {
      setScramble(
        training
          ? executionSetup(training, currentScramble.current)
          : generate3x3Scramble(),
      );
      setError("");
    } catch {
      setError("Scramble generation failed. Try New scramble.");
    }
  };
  useEffect(() => {
    onActive(phase === "running");
  }, [phase]);
  useEffect(
    () => () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      onActive(false);
    },
    [],
  );
  const cancelHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };
  const reset = () => {
    cancelHold();
    inspectionActive.current = false;
    setTimerPhase("idle");
    setElapsed(0);
  };
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (
        state !== "active" &&
        phaseRef.current !== "idle" &&
        phaseRef.current !== "result"
      ) {
        reset();
        setError("Timer cancelled because the app left the foreground.");
      }
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (phase !== "running" && !inspectionActive.current) return;
    let frame: number;
    const tick = () => {
      const now = performance.now();
      if (phaseRef.current === "running") setElapsed(now - startAt.current);
      else if (inspectionActive.current) {
        const ms = now - inspectionAt.current;
        setInspection(ms);
        const w = ms >= 12000 ? 12 : ms >= 8000 ? 8 : 0;
        if (w > warning.current) {
          warning.current = w;
          cue();
          if (store.preferences.sound)
            Speech.speak(`${w} seconds`, { language: "en-US", rate: 1.1 });
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, cue]);
  const save = (solve: Solve) => {
    update((s) => {
      if (training) {
        const attempt: Attempt = {
          ...solve,
          caseId: training.id,
          mode: "execution",
        };
        return { ...s, attempts: [attempt, ...s.attempts] };
      }
      return {
        ...s,
        sessions: s.sessions.map((x) =>
          x.id === session.id
            ? {
                ...x,
                hasAo5: x.hasAo5 || x.solves.length >= 4,
                solves: [solve, ...x.solves],
              }
            : x,
        ),
      };
    });
  };
  const down = () => {
    suppressRelease.current = false;
    const p = phaseRef.current;
    if (p === "running") {
      const ms = performance.now() - startAt.current;
      setElapsed(ms);
      setTimerPhase("result");
      suppressRelease.current = true;
      save({
        id: uid(),
        timeMs: ms,
        scramble: currentScramble.current,
        createdAt: Date.now(),
        source: "timer",
        penalty: penalty.current,
      });
      nextScramble();
      return;
    }
    if (!["idle", "result", "inspection"].includes(p)) return;
    setTimerPhase("holding");
    holdTimer.current = setTimeout(() => {
      setTimerPhase("ready");
      if (store.preferences.haptics) Haptics.selectionAsync().catch(() => {});
    }, HOLD_MS);
  };
  const release = () => {
    cancelHold();
    if (suppressRelease.current) {
      suppressRelease.current = false;
      return;
    }
    if (phaseRef.current !== "ready") {
      if (phaseRef.current === "holding")
        setTimerPhase(
          inspectionActive.current ? "inspection" : last ? "result" : "idle",
        );
      return;
    }
    if (
      store.preferences.inspection &&
      !training &&
      !inspectionActive.current
    ) {
      inspectionAt.current = performance.now();
      inspectionActive.current = true;
      warning.current = 0;
      setInspection(0);
      setTimerPhase("inspection");
      return;
    }
    penalty.current = inspectionActive.current
      ? inspectionPenalty(performance.now() - inspectionAt.current)
      : "none";
    inspectionActive.current = false;
    Speech.stop();
    startAt.current = performance.now();
    setElapsed(0);
    setTimerPhase("running");
  };
  const openActions = (solve: Solve) => {
    setSelectedSolve(solve);
    setSheet("actions");
  };
  const openEntry = (solve?: Solve) => {
    setEditSolve(solve?.id ?? null);
    setEntry(solve ? formatTime(solve.timeMs) : "");
    setInputError("");
    setSheet("entry");
  };
  const swipe = (x: number, y: number) => {
    cancelHold();
    if (phaseRef.current === "running") return;
    setTimerPhase(
      inspectionActive.current ? "inspection" : last ? "result" : "idle",
    );
    if (inspectionActive.current) return;
    if (Math.abs(x) > Math.abs(y)) {
      if (x < 0) nextScramble();
      else if (last) {
        setDeleteTarget({
          kind: "solve",
          id: last.id,
          name: formatTime(resultMs(last)),
        });
        setSheet("delete");
      }
    } else if (y > 0) openEntry();
    else if (last) {
      setAllowEdit(true);
      openActions(last);
    }
  };
  // A single gesture owns hold + swipe, so a swipe can never also start a solve.
  const moved = useRef(false),
    origin = useRef({ x: 0, y: 0 });
  const touch = Gesture.Manual()
    .runOnJS(true)
    .onTouchesMove((e) => {
      const t = e.changedTouches[0];
      if (
        t &&
        Math.hypot(
          t.absoluteX - origin.current.x,
          t.absoluteY - origin.current.y,
        ) > 28
      ) {
        moved.current = true;
        cancelHold();
        if (phaseRef.current === "holding" || phaseRef.current === "ready")
          setTimerPhase(
            inspectionActive.current ? "inspection" : last ? "result" : "idle",
          );
      }
    })
    .onTouchesUp((e, manager) => {
      const t = e.changedTouches[0];
      if (suppressRelease.current) {
        suppressRelease.current = false;
        manager.end();
        return;
      }
      if (moved.current && t)
        swipe(t.absoluteX - origin.current.x, t.absoluteY - origin.current.y);
      else release();
      manager.end();
    })
    .onTouchesCancelled((_e, manager) => {
      cancelHold();
      if (phaseRef.current === "holding" || phaseRef.current === "ready")
        setTimerPhase(
          inspectionActive.current ? "inspection" : last ? "result" : "idle",
        );
      manager.fail();
    });
  // Capture the origin before the manual gesture processes movement.
  touch.onTouchesDown((e, manager) => {
    const t = e.changedTouches[0];
    if (t) origin.current = { x: t.absoluteX, y: t.absoluteY };
    moved.current = false;
    down();
    manager.activate();
  });
  const setPenalty = (p: Penalty) => {
    if (!selectedSolve) return;
    update((s) =>
      training
        ? {
            ...s,
            attempts: s.attempts.map((a) =>
              a.id === selectedSolve.id ? { ...a, penalty: p } : a,
            ),
          }
        : {
            ...s,
            sessions: s.sessions.map((x) =>
              x.id === session.id
                ? {
                    ...x,
                    solves: x.solves.map((a) =>
                      a.id === selectedSolve.id ? { ...a, penalty: p } : a,
                    ),
                  }
                : x,
            ),
          },
    );
    setSheet(null);
  };
  const saveEntry = () => {
    const ms = parseTime(entry);
    if (ms === null) {
      setInputError("Enter a time like 12.34 or 1:02.51.");
      return;
    }
    if (editSolve)
      update((s) =>
        training
          ? {
              ...s,
              attempts: s.attempts.map((a) =>
                a.id === editSolve ? { ...a, timeMs: ms } : a,
              ),
            }
          : {
              ...s,
              sessions: s.sessions.map((x) =>
                x.id === session.id
                  ? {
                      ...x,
                      solves: x.solves.map((a) =>
                        a.id === editSolve ? { ...a, timeMs: ms } : a,
                      ),
                    }
                  : x,
              ),
            },
      );
    else {
      save({
        id: uid(),
        timeMs: ms,
        scramble,
        createdAt: Date.now(),
        source: "manual",
        penalty: "none",
      });
      setElapsed(ms);
      setTimerPhase("result");
      nextScramble();
    }
    setSheet(null);
  };
  const isImmersed = phase === "running";
  const clockColor =
    phase === "holding"
      ? color.red
      : phase === "ready"
        ? color.green
        : phase === "running"
          ? color.timerRunning
          : color.timerIdle;
  const showInspection = inspectionActive.current && phase !== "running";
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }} pointerEvents="box-none">
        <GestureDetector gesture={touch}>
          <View
            accessibilityLabel="Timer control: hold and release to start, tap to stop"
            style={StyleSheet.absoluteFill}
          />
        </GestureDetector>
        {!isImmersed && (
          <>
            <View style={styles.header} pointerEvents="box-none">
              <Pressable
                onPress={() => (training ? onExit() : setSheet("sessions"))}
                accessibilityRole="button"
                accessibilityLabel={
                  training ? "Back to training" : `Session: ${session.name}`
                }
                accessibilityState={{ expanded: sheet === "sessions" }}
                style={styles.sessionSelector}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    ui.text,
                    { fontWeight: "600", lineHeight: 22, flexShrink: 1 },
                  ]}
                >
                  {training ? `‹ ${training.name}` : session.name}
                </Text>
                {!training && (
                  <Ionicons
                    name={sheet === "sessions" ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={color.ink}
                  />
                )}
                <Text style={[ui.badge, { lineHeight: 22, marginLeft: 4 }]}>
                  3×3
                </Text>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View scrambled cube"
              onPress={() => setSheet("cube")}
              style={styles.scramble}
            >
              <Text style={ui.label}>
                {training ? `${training.type} Trainer` : "RANDOM STATE"}
              </Text>
              <Text
                style={[
                  ui.text,
                  { fontSize: 18, lineHeight: 29, textAlign: "center" },
                ]}
              >
                {scramble}
              </Text>
            </Pressable>
          </>
        )}
        <View pointerEvents="none" style={styles.clockZone}>
          <Text style={[styles.clock, { color: clockColor }]}>
            {showInspection
              ? inspection >= 17000
                ? "DNF"
                : inspection >= 15000
                  ? "+2"
                  : String(Math.ceil((15000 - inspection) / 1000))
              : phase === "running"
                ? formatTime(elapsed)
                : last
                  ? formatTime(resultMs(last))
                  : "0.00"}
          </Text>
          {showInspection && (
            <Text style={[ui.subtitle, { marginTop: 16, textAlign: "center" }]}>
              {inspection >= 12000
                ? "12 SECONDS"
                : inspection >= 8000
                  ? "8 SECONDS"
                  : "Inspection"}
            </Text>
          )}
        </View>
        {!isImmersed && (
          <View pointerEvents="box-none" style={styles.previewRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Expand cube state"
              onPress={() => setSheet("cube")}
              onLayout={(e) => setCubeWidth(e.nativeEvent.layout.width)}
              style={[
                styles.previewPanel,
                {
                  flex: 3,
                  height: panelHeight,
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              <CubeNet
                notation={scramble}
                whiteTop={!training}
                size={Math.min(
                  180,
                  (cubeWidth - 20) * 0.82,
                  ((panelHeight - 12) * 126) / 94,
                )}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open session statistics"
              onPress={() => setSheet("stats")}
              style={[
                styles.previewPanel,
                { flex: 2, height: panelHeight, padding: 8 },
              ]}
            >
              <View style={styles.compactStats}>
                <MiniStat label={ao5.label} value={formatAverage(ao5.value)} />
                <MiniStat
                  label="Ao12"
                  value={formatAverage(average(solves, 12))}
                />
                <MiniStat
                  label="Ao100"
                  value={formatAverage(average(solves, 100))}
                />
                <MiniStat
                  label="Best Single"
                  value={formatTime(best(solves))}
                />
              </View>
            </Pressable>
          </View>
        )}
        {!isImmersed && !!error && (
          <Text
            pointerEvents="none"
            style={[
              ui.error,
              {
                position: "absolute",
                bottom: panelHeight + 30,
                left: 22,
                right: 22,
              },
            ]}
          >
            {error}
          </Text>
        )}
      </View>
      {sheet === "cube" && (
        <Sheet
          title={training ? training.name : "Scrambled cube"}
          onClose={() => setSheet(null)}
        >
          <CubeNet notation={scramble} whiteTop={!training} />
          <Text style={[ui.subtitle, { textAlign: "center" }]}>
            {training ? "Yellow" : "White"} on top · green in front
          </Text>
          <Button title="New scramble" onPress={nextScramble} />
        </Sheet>
      )}
      {sheet === "sessions" && (
        <View
          style={[StyleSheet.absoluteFill, { zIndex: 20 }]}
          pointerEvents="box-none"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close session menu"
            style={StyleSheet.absoluteFill}
            onPress={() => setSheet(null)}
          />
          <View style={styles.sessionMenu}>
            <Text style={[ui.label, { marginBottom: 14 }]}>SESSIONS</Text>
            <ScrollView
              style={{ maxHeight: 280 }}
              keyboardShouldPersistTaps="handled"
            >
              {store.sessions.map((s) => (
                <View key={s.id} style={[ui.between, ui.card]}>
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => {
                      update((v) => ({ ...v, activeSessionId: s.id }));
                      reset();
                      setSheet(null);
                    }}
                  >
                    <Text style={ui.text}>
                      {s.name}
                      {s.id === session.id ? " ✓" : ""}
                    </Text>
                    <Text style={ui.subtitle}>
                      {s.solves.length} solves · 3×3
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setName(s.name);
                      setEditId(s.id);
                      setSheet("session-edit");
                    }}
                  >
                    <Text style={ui.badge}>Rename</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setDeleteTarget({
                        kind: "session",
                        id: s.id,
                        name: s.name,
                      });
                      setSheet("delete");
                    }}
                  >
                    <Text style={ui.error}>Delete</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
            <Button
              title="＋ New session"
              onPress={() => {
                setName("");
                setEditId(null);
                setSheet("session-edit");
              }}
            />
            <View style={{ height: 10 }} />
            <Button
              title="Settings"
              onPress={() => {
                setSheet(null);
                onSettings();
              }}
            />
          </View>
        </View>
      )}
      {sheet === "session-edit" && (
        <Sheet
          title={editId ? "Rename session" : "New session"}
          onClose={() => setSheet(null)}
        >
          <Text style={ui.label}>WHICH EVENT ARE YOU TIMING?</Text>
          <View style={ui.card}>
            <Text style={ui.text}>3×3 Cube ✓</Text>
          </View>
          <Text style={ui.label}>SESSION NAME</Text>
          <TextInput
            placeholderTextColor={color.muted}
            keyboardAppearance="dark"
            style={ui.input}
            value={name}
            onChangeText={setName}
            placeholder="Competition practice"
            maxLength={50}
          />
          <Button
            title="Save session"
            disabled={!name.trim()}
            onPress={() => {
              update((s) => {
                if (editId)
                  return {
                    ...s,
                    sessions: s.sessions.map((x) =>
                      x.id === editId ? { ...x, name: name.trim() } : x,
                    ),
                  };
                const id = uid();
                return {
                  ...s,
                  sessions: [
                    ...s.sessions,
                    { id, name: name.trim(), solves: [] },
                  ],
                  activeSessionId: id,
                };
              });
              reset();
              setSheet(null);
            }}
          />
        </Sheet>
      )}
      {sheet === "stats" && (
        <Sheet
          title={training ? `${training.name} statistics` : session.name}
          onClose={() => setSheet(null)}
        >
          <View style={[ui.card, ui.grid]}>
            <Stat label={ao5.label} value={formatAverage(ao5.value)} />
            <Stat label="AO12" value={formatAverage(average(solves, 12))} />
            <Stat label="AO100" value={formatAverage(average(solves, 100))} />
            <Stat label="BEST SINGLE" value={formatTime(best(solves))} />
          </View>
          <Text style={ui.label}>
            {solves.length} SOLVES · TAP FOR PENALTIES
          </Text>
          {solves.map((s, i) => (
            <Pressable
              key={s.id}
              onPress={() => {
                setAllowEdit(false);
                openActions(s);
              }}
              style={[ui.card, { padding: 14 }]}
            >
              <View style={ui.between}>
                <Text style={ui.text}>
                  {solves.length - i}. {formatTime(resultMs(s))}
                  {s.penalty === "+2" ? " +2" : ""}
                </Text>
                <Text style={ui.badge}>
                  {s.source === "manual"
                    ? "Stackmat"
                    : new Date(s.createdAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                </Text>
              </View>
              <Text style={[ui.subtitle, { fontSize: 10 }]}>{s.scramble}</Text>
            </Pressable>
          ))}
        </Sheet>
      )}
      {sheet === "entry" && (
        <Sheet
          title={editSolve ? "Edit Stackmat time" : "Stackmat entry"}
          onClose={() => setSheet(null)}
        >
          <Text style={ui.subtitle}>
            {editSolve
              ? "Update your manually entered time."
              : "This time belongs to the scramble currently on screen."}
          </Text>
          <TextInput
            placeholderTextColor={color.muted}
            keyboardAppearance="dark"
            accessibilityLabel="Solve time"
            showSoftInputOnFocus={false}
            style={ui.input}
            keyboardType="numbers-and-punctuation"
            placeholder="12.34 or 1:02.51"
            value={entry}
            onChangeText={setEntry}
          />
          <View style={[ui.grid, { marginBottom: 16 }]}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map(
              (key) => (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={key === "⌫" ? "Backspace" : key}
                  style={[
                    ui.button,
                    {
                      width: "30%",
                      backgroundColor: color.surface,
                      paddingVertical: 16,
                    },
                  ]}
                  onPress={() =>
                    setEntry((v) =>
                      key === "⌫"
                        ? v.slice(0, -1)
                        : v.length < 12
                          ? v + key
                          : v,
                    )
                  }
                >
                  <Text
                    style={{
                      fontFamily: "Digital",
                      fontSize: 25,
                      color: color.ink,
                    }}
                  >
                    {key}
                  </Text>
                </Pressable>
              ),
            )}
          </View>
          <View style={[ui.row, { marginBottom: 14 }]}>
            <Button
              title="Minutes : seconds"
              onPress={() =>
                setEntry((v) => (v && !v.includes(":") ? v + ":" : v))
              }
            />
            <Button title="Clear" onPress={() => setEntry("")} />
          </View>
          {inputError ? <Text style={ui.error}>{inputError}</Text> : null}
          <Button title="Save time" onPress={saveEntry} />
        </Sheet>
      )}
      {sheet === "actions" && selectedSolve && (
        <Sheet
          title={`Solve · ${formatTime(resultMs(selectedSolve))}`}
          onClose={() => setSheet(null)}
        >
          <View style={ui.grid}>
            {(["none", "+2", "DNF"] as Penalty[]).map((p) => (
              <Button
                key={p}
                title={p === "none" ? "No penalty" : p}
                onPress={() => setPenalty(p)}
              />
            ))}
          </View>
          <Text style={[ui.subtitle, { marginTop: 20 }]}>
            {selectedSolve.scramble}
          </Text>
          {allowEdit && selectedSolve.source === "manual" && (
            <Button
              title="Edit entered time"
              onPress={() => openEntry(selectedSolve)}
            />
          )}
        </Sheet>
      )}
      {sheet === "delete" && deleteTarget && (
        <Sheet
          title={`Delete ${deleteTarget.kind}?`}
          onClose={() => setSheet(null)}
        >
          <Text style={[ui.subtitle, { marginBottom: 20 }]}>
            Delete {deleteTarget.name}
            {deleteTarget.kind === "session" ? " and all its solves" : ""}? This
            cannot be undone.
          </Text>
          <Button
            title="Delete"
            onPress={() => {
              update((s) => {
                if (deleteTarget.kind === "solve")
                  return training
                    ? {
                        ...s,
                        attempts: s.attempts.filter(
                          (a) => a.id !== deleteTarget.id,
                        ),
                      }
                    : {
                        ...s,
                        sessions: s.sessions.map((x) =>
                          x.id === session.id
                            ? {
                                ...x,
                                solves: x.solves.filter(
                                  (a) => a.id !== deleteTarget.id,
                                ),
                              }
                            : x,
                        ),
                      };
                let sessions = s.sessions.filter(
                  (x) => x.id !== deleteTarget.id,
                );
                if (!sessions.length)
                  sessions = [
                    { id: uid(), name: DEFAULT_SESSION_NAME, solves: [] },
                  ];
                return {
                  ...s,
                  sessions,
                  activeSessionId: sessions.some(
                    (x) => x.id === s.activeSessionId,
                  )
                    ? s.activeSessionId
                    : sessions[0].id,
                };
              });
              reset();
              setSheet(null);
            }}
          />
        </Sheet>
      )}
    </View>
  );
}
function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        style={styles.miniValue}
      >
        {value}
      </Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.miniLabel}>
        {label}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  previewRow: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 16,
    flexDirection: "row",
    gap: 12,
  },
  previewPanel: {
    backgroundColor: color.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: color.line,
    overflow: "hidden",
  },
  compactStats: { flex: 1, flexDirection: "row", flexWrap: "wrap" },
  miniStat: {
    width: "50%",
    height: "50%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  miniValue: {
    fontFamily: "Digital",
    fontSize: 24,
    color: color.ink,
    textAlign: "center",
  },
  miniLabel: {
    fontFamily: "Inter",
    fontSize: 9,
    color: color.muted,
    textAlign: "center",
    marginTop: 6,
  },
  sessionSelector: {
    padding: 12,
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sessionMenu: {
    position: "absolute",
    top: 58,
    left: 10,
    right: 10,
    maxWidth: 420,
    backgroundColor: color.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: color.line,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    paddingHorizontal: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 64,
  },
  scramble: { marginHorizontal: 24, padding: 12, alignItems: "center" },
  clockZone: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  clock: { fontFamily: "Digital", fontSize: 78, letterSpacing: -3 },
});
