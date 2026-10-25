import { useResponsiveLayout } from "../components/responsive";
import { useCallback, useEffect, useReducer, useState } from "react";
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
import { localDate, selectDailies } from "../domain/progress";
import {
  achievementReducer,
  createAchievementState,
  UpdateStore,
} from "../domain/achievements";
import {
  AchievementBanner,
  AchievementProvider,
} from "../components/Achievements";
import { recognitionReady } from "../domain/content";
import { formatTime, best } from "../domain/statistics";
import { SessionScreen } from "../components/Session";
import { Timer } from "../components/Timer";
import {
  CaseImage,
  CubePreview,
  RotatingRecognitionCube,
} from "../components/CubePreview";
import { Algorithms, AlgorithmViewState } from "../components/Algorithms";
import { Recognition } from "../components/Recognition";
import { Progress } from "../components/Progress";
import { BackButton, Button, Sheet } from "../components/common";
import { color, ui } from "../components/theme";
type Tab = "Session" | "Timer" | "Train" | "Algorithms" | "Progress";
export default function App() {
  const insets = useSafeAreaInsets();
  const [{ store, banners, record }, dispatch] = useReducer(
    achievementReducer,
    undefined,
    () => createAchievementState(defaultStore()),
  );
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("Timer"),
    [active, setActive] = useState(false),
    [settings, setSettings] = useState(false);
  const [experienceSetup, setExperienceSetup] = useState(false);
  const [timerBusy, setTimerBusy] = useState(false);
  const [training, setTraining] = useState<{
      item: Case;
      mode: "execution" | "recognition";
      scope?: "single" | "family" | "type";
      recognitionMode?: "full" | "two-sided";
      dailyDate?: string;
      caseStats?: boolean;
      returnToAlgorithms?: boolean;
    } | null>(null),
    [detail, setDetail] = useState<Case | undefined>();
  const [algorithmView, setAlgorithmView] = useState<AlgorithmViewState>({
    type: "OLL",
    filter: "All",
    family: "none",
    pbSort: null,
  });
  const [prompt, setPrompt] = useState<{ id: string; count: number } | null>(
    null,
  );
  const [fonts] = useFonts({
    Inter: Inter_400Regular,
    Digital: ShareTechMono_400Regular,
  });
  const update = useCallback<UpdateStore>(
    (fn, context) => dispatch({ type: "update", fn, context, now: Date.now() }),
    [],
  );
  const dismissBanner = useCallback(
    (id: string) => dispatch({ type: "dismiss-banner", id }),
    [],
  );
  const dismissRecord = useCallback(
    (id: string) => dispatch({ type: "dismiss-record", id }),
    [],
  );
  const boot = () => {
    setError("");
    loadStore()
      .then((s) => {
        dispatch({ type: "load", store: selectDailies(s) });
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
    const returnToAlgorithms = training?.returnToAlgorithms;
    const caseToReopen = training?.item;
    setTraining(null);
    setActive(false);
    if (returnToAlgorithms && caseToReopen) {
      setDetail(caseToReopen);
      setTab("Algorithms");
    } else setTab("Train");
  };
  const start = (
    item: Case,
    mode: "execution" | "recognition",
    scope: "single" | "family" | "type" = "single",
    recognitionMode?: "full" | "two-sided",
    dailyDate?: string,
    caseStats?: boolean,
    returnToAlgorithms?: boolean,
  ) => {
    setDetail(undefined);
    setTraining({
      item,
      mode,
      scope,
      recognitionMode,
      dailyDate,
      caseStats,
      returnToAlgorithms,
    });
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
    <AchievementProvider
      banner={banners[0]}
      paused={active || timerBusy || experienceSetup}
      dismiss={dismissBanner}
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: color.bg }}
        edges={active ? ["left", "right"] : ["top", "bottom", "left", "right"]}
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
        {!!error && (
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
          style={{
            flex: 1,
            width: "100%",
            maxWidth: 1100,
            alignSelf: "center",
          }}
        >
          {training ? (
            training.mode === "execution" ? (
              <Timer
                key={training.item.id}
                store={store}
                update={update}
                training={training.item}
                dailyDate={training.dailyDate}
                caseStats={training.caseStats}
                onExit={exit}
                onActive={setActive}
                onBusy={setTimerBusy}
                record={record}
                onRecordComplete={dismissRecord}
                onSettings={() => setSettings(true)}
              />
            ) : (
              <Recognition
                item={training.item}
                scope={training.scope}
                initialMode={training.recognitionMode}
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
              onBusy={setTimerBusy}
              record={record}
              onRecordComplete={dismissRecord}
              onSettings={() => setSettings(true)}
            />
          ) : tab === "Session" ? (
            <SessionScreen store={store} update={update} />
          ) : tab === "Algorithms" ? (
            <Algorithms
              store={store}
              update={update}
              onExecution={(c) =>
                start(
                  c,
                  "execution",
                  "single",
                  undefined,
                  undefined,
                  true,
                  true,
                )
              }
              onRecognition={(c) => start(c, "recognition")}
              initialCase={detail}
              initialView={algorithmView}
              onViewChange={setAlgorithmView}
              onCloseCase={() => setDetail(undefined)}
            />
          ) : tab === "Progress" ? (
            <Progress store={store} />
          ) : (
            <Train store={store} start={start} update={update} />
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
              width: "100%",
              maxWidth: 1100,
              alignSelf: "center",
            }}
          >
            {(
              ["Timer", "Session", "Train", "Algorithms", "Progress"] as const
            ).map((t, i) => (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === t }}
                key={t}
                onPress={() => {
                  setDetail(undefined);
                  setTab(t);
                  if (
                    (t === "Train" || t === "Algorithms") &&
                    !store.preferences.onboarding
                  )
                    setExperienceSetup(true);
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
                        "list-outline",
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
            ))}
          </View>
        )}
        {settings && (
          <Sheet title="Settings" onClose={() => setSettings(false)}>
            {(
              [
                ["inspection", "15-second inspection"],
                ["sound", "Spoken inspection warnings"],
                ["haptics", "Haptic feedback"],
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
              Inspection cues at 8 and 12 seconds. At 15 seconds a +2 applies;
              at 17 seconds the result is DNF.
            </Text>
            <View style={ui.divider} />
            <Text style={ui.subtitle}>Cube.io</Text>
            <Text style={[ui.subtitle, { marginTop: 12 }]}>
              Donate · coming soon
            </Text>
          </Sheet>
        )}
        {experienceSetup && !store.preferences.onboarding && (
          <Onboarding
            store={store}
            update={update}
            onComplete={() => setExperienceSetup(false)}
          />
        )}
        {prompt && (
          <Sheet title="Feeling confident?" onClose={() => setPrompt(null)}>
            <Text style={[ui.subtitle, { marginBottom: 20 }]}>
              You’ve practiced{" "}
              {store.cases.find((c) => c.id === prompt.id)?.name} {prompt.count}{" "}
              times. Mark this case as learned?
            </Text>
            <Button
              title="Mark learned"
              onPress={() => {
                update(
                  (s) => ({
                    ...s,
                    learned: [...new Set([...s.learned, prompt.id])],
                  }),
                  { learning: "learn" },
                );
                setPrompt(null);
              }}
            />
            <View style={{ height: 10 }} />
            <Button title="Not yet" onPress={() => setPrompt(null)} />
          </Sheet>
        )}
        <AchievementBanner />
      </SafeAreaView>
    </AchievementProvider>
  );
}
function Train({
  store,
  start,
  update,
}: {
  store: Store;
  start: (
    c: Case,
    mode: "execution" | "recognition",
    scope?: "single" | "family" | "type",
    recognitionMode?: "full" | "two-sided",
    dailyDate?: string,
  ) => void;
  update: (fn: (s: Store) => Store) => void;
}) {
  const layout = useResponsiveLayout();
  const [detail, setDetail] = useState<Case | null>(null);
  const [dailyDetail, setDailyDetail] = useState<{
    id: string;
    date: string;
  } | null>(null);
  const [cubeTouched, setCubeTouched] = useState(false);
  const [practiceType, setPracticeType] = useState<"OLL" | "PLL" | null>(null);
  const [filter, setFilter] = useState<"OLL" | "PLL" | null>(null);
  const allLearned = (type: "OLL" | "PLL") =>
    store.cases.filter(
      (c) => c.type === type && c.setup && store.learned.includes(c.id),
    );
  const learned = (type: "OLL" | "PLL") =>
    allLearned(type).filter(
      (c) => !(store.selected[`targeted:${type}`] ?? []).includes(c.id),
    );
  if (detail)
    return (
      <ScrollView
        scrollEnabled={!cubeTouched}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[ui.page, layout.page]}
      >
        <BackButton
          onPress={() => {
            setDetail(null);
            setDailyDetail(null);
          }}
        />
        <Text style={[ui.title, { marginTop: 18 }]}>
          {detail.type === "OLL"
            ? `OLL ${detail.number} · ${detail.family}`
            : detail.name}
        </Text>
        {detail.type === "PLL" && (
          <Text style={[ui.subtitle, { marginTop: 6 }]}>{detail.family}</Text>
        )}
        <View style={[ui.card, { alignItems: "center", marginTop: 22 }]}>
          <CubePreview
            onInteractionChange={setCubeTouched}
            notation={detail.setup}
            oll={detail.type === "OLL"}
            size={Math.min(270, layout.width - layout.padding * 2 - 42)}
          />
        </View>
        <View style={ui.card}>
          <Text style={ui.label}>ALGORITHM</Text>
          <Text style={[ui.text, { fontSize: 17, lineHeight: 27 }]}>
            {detail.algorithms[0] || "No algorithm added yet"}
          </Text>
        </View>
        <Button
          title="Practice execution"
          onPress={() =>
            start(
              detail,
              "execution",
              "single",
              undefined,
              dailyDetail?.id === detail.id ? dailyDetail.date : undefined,
            )
          }
        />
        <View style={{ height: 12 }} />
        <Button
          title={
            detail.type === "OLL"
              ? "Practice family recognition"
              : "Practice 2-face recognition"
          }
          disabled={!recognitionReady(detail, store.cases)}
          onPress={() =>
            start(
              detail,
              "recognition",
              detail.type === "OLL" ? "family" : "single",
              "two-sided",
            )
          }
        />
      </ScrollView>
    );
  if (practiceType)
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[ui.page, layout.page]}
      >
        <BackButton
          onPress={() => {
            setPracticeType(null);
            setFilter(null);
          }}
        />
        <Text style={[ui.title, { marginTop: 20, marginBottom: 24 }]}>
          {practiceType} Practice
        </Text>
        {(
          [
            ["Recognition Easy", "OLL", "recognition", "type"],
            ["Recognition Hard", "OLL", "recognition", "type"],
            ["Execution", "OLL", "execution", "type"],
            ["Recognition Easy", "PLL", "recognition", "type"],
            ["Recognition Hard", "PLL", "recognition", "type"],
            ["Execution", "PLL", "execution", "type"],
          ] as const
        )
          .filter(([, type]) => type === practiceType)
          .map(([label, type, mode, scope]) => {
            const cases =
              mode === "recognition"
                ? allLearned(type).filter((c) =>
                    recognitionReady(c, store.cases),
                  )
                : learned(type);
            const hasCases = cases.length > 0;
            return (
              <View key={label} style={[ui.row, { marginBottom: 10 }]}>
                <Pressable
                  accessibilityRole="button"
                  disabled={!hasCases}
                  onPress={() =>
                    hasCases &&
                    start(
                      cases[Math.floor(Math.random() * cases.length)],
                      mode,
                      scope,
                      label === "Recognition Easy" ? "full" : "two-sided",
                    )
                  }
                  style={[
                    ui.button,
                    { flex: 1 },
                    !hasCases && { opacity: 0.4 },
                  ]}
                >
                  <Text style={ui.buttonText}>{label}</Text>
                </Pressable>
                {mode === "execution" && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: filter === type }}
                    onPress={() => setFilter(filter === type ? null : type)}
                    style={ui.chip}
                    accessibilityLabel={`Choose ${type} cases`}
                  >
                    <Ionicons
                      name="options-outline"
                      size={20}
                      color={color.accent}
                    />
                  </Pressable>
                )}
              </View>
            );
          })}
        {filter && (
          <View style={ui.card}>
            <Text style={ui.label}>
              {filter === "OLL" ? "OLL FAMILIES" : "PLL CASES"}
            </Text>
            <Text style={[ui.subtitle, { marginBottom: 12 }]}>
              Tap {filter === "OLL" ? "a family" : "a PLL"} to filter it out and
              hit the Execution button to begin
            </Text>
            {allLearned(filter).length === 0 && (
              <Text style={ui.subtitle}>
                Mark cases as learned in Algorithms to practice them here.
              </Text>
            )}
            <View style={ui.grid}>
              {[
                ...new Set(
                  allLearned(filter).map((c) =>
                    filter === "OLL" ? c.family : c.id,
                  ),
                ),
              ].map((key) => {
                const members = allLearned(filter).filter((c) =>
                  filter === "OLL" ? c.family === key : c.id === key,
                );
                const groupIds = store.cases
                  .filter(
                    (c) =>
                      c.type === filter &&
                      (filter === "OLL" ? c.family === key : c.id === key),
                  )
                  .map((c) => c.id);
                const blocked = store.selected[`targeted:${filter}`] ?? [];
                const excluded = members.every((c) => blocked.includes(c.id));
                const mixed =
                  !excluded && members.some((c) => blocked.includes(c.id));
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: mixed ? "mixed" : !excluded,
                    }}
                    onPress={() =>
                      update((s) => {
                        const previous = s.selected[`targeted:${filter}`] ?? [];
                        return {
                          ...s,
                          selected: {
                            ...s.selected,
                            [`targeted:${filter}`]: excluded
                              ? previous.filter((id) => !groupIds.includes(id))
                              : [...new Set([...previous, ...groupIds])],
                          },
                        };
                      })
                    }
                    style={[
                      ui.chip,
                      {
                        backgroundColor: excluded ? "#4b2531" : "#173d33",
                        borderColor: excluded ? color.red : color.green,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        ui.text,
                        { color: excluded ? color.red : color.green },
                      ]}
                    >
                      {filter === "OLL" ? key : members[0].name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    );
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[ui.page, layout.page]}
    >
      {(["OLL", "PLL"] as const).map((t) => {
        const item = store.cases.find(
          (c) => c.id === store.daily[`${localDate()}:${t}`],
        );
        if (!item) return null;
        return (
          <Pressable
            key={t}
            onPress={() => {
              setDailyDetail({ id: item.id, date: localDate() });
              setDetail(item);
            }}
            style={ui.card}
          >
            <View style={ui.between}>
              <Text style={ui.label}>DAILY {t}</Text>
              <Text style={ui.badge}>
                {store.learned.includes(item.id) ? "" : "New!"}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-evenly",
                gap: 8,
              }}
            >
              <CaseImage
                setup={item.setup}
                oll={t === "OLL"}
                imageId={item.imageId}
                size={104}
              />
              <RotatingRecognitionCube
                setup={item.setup}
                oll={t === "OLL"}
                size={144}
                autoRotate
              />
            </View>
            {t === "PLL" && (
              <Text style={[ui.text, { marginTop: 8 }]}>{item.name}</Text>
            )}
            <Text style={[ui.subtitle, { marginTop: 10 }]}>
              PB{" "}
              {formatTime(
                best(
                  store.attempts.filter(
                    (a) => a.caseId === item.id && a.mode === "execution",
                  ),
                ),
              )}
            </Text>
          </Pressable>
        );
      })}
      <Text style={[ui.label, { marginTop: 20 }]}>PRACTICE</Text>
      <View style={[ui.row, { flexWrap: "nowrap" }]}>
        {(["OLL", "PLL"] as const).map((type) => (
          <Pressable
            key={type}
            accessibilityRole="button"
            accessibilityLabel={`${type} practice`}
            onPress={() => {
              setFilter(null);
              setPracticeType(type);
            }}
            style={[ui.button, { flex: 1, minHeight: 64 }]}
          >
            <Text style={[ui.buttonText, { fontSize: 18 }]}>{type}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
function Onboarding({
  store,
  update,
  onComplete,
}: {
  store: Store;
  update: UpdateStore;
  onComplete: () => void;
}) {
  const layout = useResponsiveLayout();
  const [step, setStep] = useState(0),
    [known, setKnown] = useState(store.learned);
  const finish = () => {
    update(
      (s) => ({
        ...s,
        learned: known,
        preferences: { ...s.preferences, onboarding: true },
      }),
      { learning: "setup" },
    );
    onComplete();
  };
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            ui.page,
            layout.page,
            {
              paddingTop: layout.wide ? 60 : 28,
              maxWidth: 760,
              width: "100%",
              alignSelf: "center",
            },
          ]}
        >
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
            onPress={() => {
              update((s) => ({
                ...s,
                preferences: { ...s.preferences, onboarding: true },
              }));
              onComplete();
            }}
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
  const layout = useResponsiveLayout();
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        horizontal
        style={{ marginBottom: 14 }}
      >
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
              {
                width: layout.wide ? "30%" : "47%",
                alignItems: "center",
                padding: 10,
              },
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
