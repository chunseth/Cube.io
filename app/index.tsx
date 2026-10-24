import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { ShareTechMono_400Regular } from "@expo-google-fonts/share-tech-mono/400Regular";
import { Ionicons } from "@expo/vector-icons";
import { Case, Store } from "../domain/models";
import { defaultStore, loadStore, saveStore } from "../database/repository";
import {
  evaluateAchievements,
  localDate,
  selectDailies,
} from "../domain/progress";
import { recognitionReady } from "../domain/content";
import { formatTime, best } from "../domain/statistics";
import { prepareScrambleService } from "../domain/scrambles/scrambleService";
import { Timer } from "../components/Timer";
import { CaseImage } from "../components/CubePreview";
import { Algorithms } from "../components/Algorithms";
import { Recognition } from "../components/Recognition";
import { Progress } from "../components/Progress";
import { Button, Sheet } from "../components/common";
import { color, ui } from "../components/theme";
type Tab = "Timer" | "Train" | "Algorithms" | "Progress";
export default function App() {
  const insets = useSafeAreaInsets();
  const [store, setStore] = useState<Store>(defaultStore),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("Timer"),
    [active, setActive] = useState(false),
    [settings, setSettings] = useState(false);
  const [training, setTraining] = useState<{
      item: Case;
      mode: "execution" | "recognition";
    } | null>(null),
    [detail, setDetail] = useState<Case | undefined>();
  const [prompt, setPrompt] = useState<{ id: string; count: number } | null>(
    null,
  );
  const [fonts] = useFonts({
    Inter: Inter_400Regular,
    Digital: ShareTechMono_400Regular,
  });
  const update = useCallback(
    (fn: (s: Store) => Store) => setStore((s) => evaluateAchievements(fn(s))),
    [],
  );
  const boot = () => {
    setError("");
    loadStore()
      .then((s) => {
        prepareScrambleService();
        setStore(selectDailies(evaluateAchievements(s)));
        setReady(true);
      })
      .catch(() =>
        setError(
          "Practice could not be initialized. Your saved data has not been changed. Retry to continue.",
        ),
      );
  };
  useEffect(boot, []);
  useEffect(() => {
    if (ready)
      saveStore(store)
        .then(() => setError(""))
        .catch(() =>
          setError("Changes could not be saved. Keep the app open and retry."),
        );
  }, [ready, store]);
  useEffect(() => {
    if (!ready) return;
    const refresh = () => update((s) => selectDailies(s));
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const next = new Date();
      next.setHours(24, 0, 0, 0);
      timeout = setTimeout(
        () => {
          refresh();
          schedule();
        },
        next.getTime() - Date.now() + 50,
      );
    };
    schedule();
    const listener = AppState.addEventListener("change", (s) => {
      if (s === "active") refresh();
    });
    return () => {
      clearTimeout(timeout);
      listener.remove();
    };
  }, [ready, update]);
  useEffect(() => {
    if (!training || training.mode !== "execution") return;
    const id = training.item.id;
    const count = store.attempts.filter(
      (a) => a.caseId === id && a.mode === "execution",
    ).length;
    const key = `${id}:${count}`;
    if (
      [5, 10, 15].includes(count) &&
      !store.learned.includes(id) &&
      !store.prompts.includes(key)
    ) {
      update((s) => ({ ...s, prompts: [...s.prompts, key] }));
      setPrompt({ id, count });
    }
  }, [store.attempts, training]);
  const exit = () => {
    setTraining(null);
    setActive(false);
    setTab("Train");
  };
  const start = (item: Case, mode: "execution" | "recognition") => {
    setDetail(undefined);
    setTraining({ item, mode });
  };
  if (!ready || !fonts)
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: color.bg,
          alignItems: "center",
          justifyContent: "center",
          padding: 30,
        }}
      >
        {error ? (
          <>
            <Text style={ui.error}>{error}</Text>
            <Button title="Retry" onPress={boot} />
          </>
        ) : (
          <>
            <ActivityIndicator color={color.accent} />
            <Text style={[ui.subtitle, { marginTop: 16 }]}>
              Getting your practice space ready…
            </Text>
          </>
        )}
      </SafeAreaView>
    );
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: color.bg }}
      edges={active ? [] : ["top", "bottom"]}
    >
      {!active && !training && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: insets.bottom,
            backgroundColor: color.surface,
          }}
        />
      )}
      <StatusBar style="light" hidden={active} />
      {error && (
        <Pressable
          onPress={() =>
            saveStore(store)
              .then(() => setError(""))
              .catch(() => {})
          }
          style={{ padding: 12 }}
        >
          <Text style={ui.error}>{error} Tap to retry.</Text>
        </Pressable>
      )}
      <View
        style={{ flex: 1, width: "100%", maxWidth: 760, alignSelf: "center" }}
      >
        {training ? (
          training.mode === "execution" ? (
            <Timer
              key={training.item.id}
              store={store}
              update={update}
              training={training.item}
              onExit={exit}
              onActive={setActive}
              onSettings={() => setSettings(true)}
            />
          ) : (
            <Recognition
              item={training.item}
              store={store}
              update={update}
              onExit={exit}
            />
          )
        ) : tab === "Timer" ? (
          <Timer
            key={store.activeSessionId}
            store={store}
            update={update}
            onExit={() => {}}
            onActive={setActive}
            onSettings={() => setSettings(true)}
          />
        ) : tab === "Algorithms" ? (
          <Algorithms
            store={store}
            update={update}
            onExecution={(c) => start(c, "execution")}
            onRecognition={(c) => start(c, "recognition")}
            initialCase={detail}
            onCloseCase={() => setDetail(undefined)}
          />
        ) : tab === "Progress" ? (
          <Progress store={store} />
        ) : (
          <Train
            store={store}
            openCase={(c) => {
              setDetail(c);
              setTab("Algorithms");
            }}
            start={start}
          />
        )}
      </View>
      {!active && !training && (
        <View
          style={{
            flexDirection: "row",
            borderTopWidth: 1,
            borderColor: color.line,
            backgroundColor: color.surface,
            paddingVertical: 11,
          }}
        >
          {(["Timer", "Train", "Algorithms", "Progress"] as const).map(
            (t, i) => (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === t }}
                key={t}
                onPress={() => {
                  setDetail(undefined);
                  setTab(t);
                }}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 7,
                  gap: 5,
                }}
              >
                <Ionicons
                  name={
                    (
                      [
                        "stopwatch-outline",
                        "layers-outline",
                        "grid-outline",
                        "stats-chart-outline",
                      ] as const
                    )[i]
                  }
                  size={21}
                  color={tab === t ? color.accent : color.muted}
                />
                <Text
                  style={{
                    fontFamily: "Inter",
                    fontSize: 10,
                    color: tab === t ? color.ink : color.muted,
                  }}
                >
                  {t}
                </Text>
              </Pressable>
            ),
          )}
        </View>
      )}
      {settings && (
        <Sheet title="Settings" onClose={() => setSettings(false)}>
          {(
            [
              ["inspection", "15-second inspection"],
              ["haptics", "Haptic feedback"],
              ["sound", "Spoken inspection warnings"],
            ] as const
          ).map(([key, label]) => (
            <View key={key} style={[ui.card, ui.between]}>
              <Text style={ui.text}>{label}</Text>
              <Switch
                trackColor={{ false: color.line, true: color.accent }}
                thumbColor={color.ink}
                value={store.preferences[key]}
                onValueChange={(v) =>
                  update((s) => ({
                    ...s,
                    preferences: { ...s.preferences, [key]: v },
                  }))
                }
              />
            </View>
          ))}
          <Text style={[ui.subtitle, { marginBottom: 20 }]}>
            Inspection cues at 8 and 12 seconds. At 15 seconds a +2 applies; at
            17 seconds the result is DNF.
          </Text>
          <Button
            title="Set up known algorithms"
            onPress={() => {
              setSettings(false);
              update((s) => ({
                ...s,
                preferences: { ...s.preferences, onboarding: false },
              }));
            }}
          />
          <View style={ui.divider} />
          <Text style={ui.subtitle}>Cube.io · Offline practice for 3×3</Text>
          <Text style={[ui.subtitle, { marginTop: 12 }]}>
            Donate · coming soon
          </Text>
        </Sheet>
      )}
      {!store.preferences.onboarding && (
        <Onboarding store={store} update={update} />
      )}
      {prompt && (
        <Sheet title="Feeling confident?" onClose={() => setPrompt(null)}>
          <Text style={[ui.subtitle, { marginBottom: 20 }]}>
            You’ve practiced {store.cases.find((c) => c.id === prompt.id)?.name}{" "}
            {prompt.count} times. Mark this case as learned?
          </Text>
          <Button
            title="Mark learned"
            onPress={() => {
              update((s) => ({
                ...s,
                learned: [...new Set([...s.learned, prompt.id])],
              }));
              setPrompt(null);
            }}
          />
          <View style={{ height: 10 }} />
          <Button title="Not yet" onPress={() => setPrompt(null)} />
        </Sheet>
      )}
    </SafeAreaView>
  );
}
function Train({
  store,
  openCase,
  start,
}: {
  store: Store;
  openCase: (c: Case) => void;
  start: (c: Case, mode: "execution" | "recognition") => void;
}) {
  const [type, setType] = useState<"OLL" | "PLL">("PLL");
  return (
    <ScrollView contentContainerStyle={ui.page}>
      <Text style={ui.title}>A little better, every day.</Text>
      <Text style={[ui.subtitle, { marginTop: 10, marginBottom: 28 }]}>
        Focus your practice. Find your next breakthrough.
      </Text>
      <Text style={ui.label}>TODAY’S FOCUS</Text>
      {(["OLL", "PLL"] as const).map((t) => {
        const item = store.cases.find(
          (c) => c.id === store.daily[`${localDate()}:${t}`],
        );
        if (!item) return null;
        return (
          <Pressable key={t} onPress={() => openCase(item)} style={ui.card}>
            <Text style={ui.label}>DAILY {t}</Text>
            <View style={ui.between}>
              <Text style={[ui.title, { fontSize: 23 }]}>{item.name}</Text>
              <Text style={ui.badge}>
                {store.learned.includes(item.id) ? "✓ Learned" : "To learn"}
              </Text>
            </View>
            <Text style={[ui.subtitle, { marginTop: 10 }]}>
              Execution PB{" "}
              {formatTime(
                best(
                  store.attempts.filter(
                    (a) => a.caseId === item.id && a.mode === "execution",
                  ),
                ),
              )}
            </Text>
            <Text style={ui.badge}>
              {item.setup ? "Open case →" : "Add case content to begin →"}
            </Text>
          </Pressable>
        );
      })}
      <Text style={[ui.label, { marginTop: 20 }]}>TARGETED PRACTICE</Text>
      <View style={[ui.row, { marginBottom: 20 }]}>
        {(["OLL", "PLL"] as const).map((t) => (
          <Pressable
            key={t}
            style={[ui.chip, type === t && ui.selected]}
            onPress={() => setType(t)}
          >
            <Text style={ui.text}>{t}</Text>
          </Pressable>
        ))}
      </View>
      {store.cases
        .filter((c) => c.type === type && c.setup)
        .map((c) => (
          <View key={c.id} style={ui.card}>
            <Text style={[ui.text, { marginBottom: 14 }]}>{c.name}</Text>
            <View style={ui.grid}>
              <Button title="Execution" onPress={() => start(c, "execution")} />
              <Button
                title="Recognition"
                disabled={!recognitionReady(c, store.cases)}
                onPress={() => start(c, "recognition")}
              />
            </View>
          </View>
        ))}
      {!store.cases.some((c) => c.type === type && c.setup) && (
        <View style={ui.card}>
          <Text style={ui.subtitle}>
            Your training space is ready. Add setup scrambles and recognition
            choices in Algorithms → Content editor to unlock cases.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
function Onboarding({
  store,
  update,
}: {
  store: Store;
  update: (fn: (s: Store) => Store) => void;
}) {
  const [step, setStep] = useState(0),
    [known, setKnown] = useState(store.learned);
  const finish = () =>
    update((s) => ({
      ...s,
      learned: known,
      preferences: { ...s.preferences, onboarding: true },
    }));
  const type = step === 1 ? "OLL" : "PLL";
  const choose = (level: "none" | "two" | "all") => {
    const group = store.cases.filter((c) => c.type === type);
    setKnown((k) => [
      ...k.filter((id) => !group.some((c) => c.id === id)),
      ...group
        .filter((c) => level === "all" || (level === "two" && c.twoLook))
        .map((c) => c.id),
    ]);
    setStep((s) => s + 1);
  };
  return (
    <Modal animationType="fade">
      <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
        <ScrollView contentContainerStyle={[ui.page, { paddingTop: 60 }]}>
          <Text style={ui.label}>CUBE.IO · YOUR PRACTICE SPACE</Text>
          <Text
            style={[ui.title, { fontSize: 36, lineHeight: 44, marginTop: 20 }]}
          >
            {step === 0
              ? "Solve. Train.\nFind your flow."
              : step < 3
                ? `Where are you\nwith ${type}?`
                : "Make it yours."}
          </Text>
          <Text style={[ui.subtitle, { marginVertical: 24 }]}>
            {step === 0
              ? "A focused timer and last-layer trainer for your next personal best. Everything stays on your device."
              : step < 3
                ? "Start with a familiar set. You can adjust individual cases next."
                : "Confirm the cases you know. You can change these in Algorithms anytime."}
          </Text>
          {step === 0 ? (
            <Button title="Let’s get started" onPress={() => setStep(1)} />
          ) : step < 3 ? (
            <View style={{ gap: 12 }}>
              <Button
                title="I’m just starting"
                onPress={() => choose("none")}
              />
              <Button title="I know 2-look" onPress={() => choose("two")} />
              <Button
                title="I’m learning the full set"
                onPress={() => choose("two")}
              />
              <Button
                title={`I know full ${type}`}
                onPress={() => choose("all")}
              />
            </View>
          ) : (
            <>
              <Button title="Start practicing" onPress={finish} />
              <View style={{ height: 20 }} />
              <KnownCasePicker
                cases={store.cases}
                known={known}
                setKnown={setKnown}
              />
              <View style={{ height: 24 }} />
              <Button title="Start practicing" onPress={finish} />
            </>
          )}
          <Pressable
            style={{ padding: 24, alignItems: "center" }}
            onPress={() =>
              update((s) => ({
                ...s,
                preferences: { ...s.preferences, onboarding: true },
              }))
            }
          >
            <Text style={ui.badge}>Set up later</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function KnownCasePicker({
  cases,
  known,
  setKnown,
}: {
  cases: Case[];
  known: string[];
  setKnown: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const [type, setType] = useState<"OLL" | "PLL">("OLL"),
    [family, setFamily] = useState("All");
  const families = [
    ...new Set(cases.filter((c) => c.type === type).map((c) => c.family)),
  ];
  const visible = cases.filter(
    (c) => c.type === type && (family === "All" || c.family === family),
  );
  const toggleGroup = () => {
    const ids = visible.map((c) => c.id);
    setKnown((k) =>
      ids.every((id) => k.includes(id))
        ? k.filter((id) => !ids.includes(id))
        : [...new Set([...k, ...ids])],
    );
  };
  return (
    <>
      <View style={[ui.row, { marginBottom: 14 }]}>
        {(["OLL", "PLL"] as const).map((t) => (
          <Pressable
            key={t}
            style={[ui.chip, type === t && ui.selected]}
            onPress={() => {
              setType(t);
              setFamily("All");
            }}
          >
            <Text style={ui.text}>{t}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView horizontal style={{ marginBottom: 14 }}>
        <View style={ui.row}>
          {["All", ...families].map((f) => (
            <Pressable
              key={f}
              style={[ui.chip, family === f && ui.selected]}
              onPress={() => setFamily(f)}
            >
              <Text style={ui.badge}>{f}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <View style={[ui.row, { marginBottom: 18 }]}>
        <Button title="Toggle visible group" onPress={toggleGroup} />
        <Button
          title="Clear"
          onPress={() =>
            setKnown((k) => k.filter((id) => !visible.some((c) => c.id === id)))
          }
        />
      </View>
      <View style={ui.grid}>
        {visible.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: known.includes(c.id) }}
            style={[
              ui.card,
              { width: "47%", alignItems: "center" },
              known.includes(c.id) && ui.selected,
            ]}
            onPress={() =>
              setKnown((k) =>
                k.includes(c.id) ? k.filter((id) => id !== c.id) : [...k, c.id],
              )
            }
          >
            {c.setup && <CaseImage setup={c.setup} oll={c.type === "OLL"} />}
            <Text style={ui.text}>
              {c.name}
              {known.includes(c.id) ? " ✓" : ""}
            </Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}
