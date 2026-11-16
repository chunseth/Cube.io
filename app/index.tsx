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
import { RecognitionScope } from "../domain/recognition";
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
      scope?: RecognitionScope;
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
    scope: RecognitionScope = "single",
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
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{
                    fontFamily: "Inter",
                    fontSize: 11,
                    maxWidth: "100%",
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
            topInset={insets.top}
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
    scope?: RecognitionScope,
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
            dailyDetail?.id === detail.id
              ? "Practice mixed recognition"
              : detail.type === "OLL"
                ? "Practice family recognition"
                : "Practice 2-face recognition"
          }
          disabled={!recognitionReady(detail, store.cases)}
          onPress={() =>
            start(
              detail,
              "recognition",
              dailyDetail?.id === detail.id
                ? "similar"
                : detail.type === "OLL"
                  ? "family"
                  : "single",
              "two-sided",
            )
          }
        />
        {dailyDetail?.id === detail.id && (
          <Text style={[ui.subtitle, { marginTop: 8 }]}>
            Quiz today's case alongside similar patterns.
          </Text>
        )}
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
  topInset,
  onComplete,
}: {
  store: Store;
  update: UpdateStore;
  topInset: number;
  onComplete: () => void;
}) {
  const layout = useResponsiveLayout();
  type StartingLevel = "starting" | "two-look" | "full";
  const initialLevel = (type: "OLL" | "PLL"): StartingLevel => {
    const group = store.cases.filter((c) => c.type === type);
    const known = new Set(store.learned);
    if (group.length > 0 && group.every((c) => known.has(c.id))) return "full";
    if (group.filter((c) => c.twoLook).every((c) => known.has(c.id)))
      return "two-look";
    return "starting";
  };
  const [levels, setLevels] = useState<Record<"OLL" | "PLL", StartingLevel>>({
    OLL: initialLevel("OLL"),
    PLL: initialLevel("PLL"),
  });
  const finish = () => {
    const known = (["OLL", "PLL"] as const).flatMap((type) => {
      const level = levels[type];
      return store.cases
        .filter(
          (c) =>
            c.type === type &&
            (level === "full" || (level === "two-look" && c.twoLook)),
        )
        .map((c) => c.id);
    });
    update(
      (s) => ({
        ...s,
        learned: [
          ...s.learned.filter((id) => !store.cases.some((c) => c.id === id)),
          ...known,
        ],
        preferences: { ...s.preferences, onboarding: true },
      }),
      { learning: "setup" },
    );
    onComplete();
  };
  const options: { value: StartingLevel; label: string }[] = [
    { value: "starting", label: "Just starting" },
    { value: "two-look", label: "2-Look" },
    { value: "full", label: "Full Set" },
  ];
  const renderOption = (
    type: "OLL" | "PLL",
    option: (typeof options)[number],
    fullWidth = false,
  ) => {
    const selected = levels[type] === option.value;
    return (
      <Pressable
        key={option.value}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        onPress={() =>
          setLevels((current) => ({ ...current, [type]: option.value }))
        }
        style={[
          ui.chip,
          selected && ui.selected,
          {
            flex: fullWidth ? undefined : 1,
            height: 44,
            minHeight: 44,
            paddingVertical: 0,
            paddingHorizontal: 8,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <Text numberOfLines={1} style={ui.buttonText}>
          {option.label}
        </Text>
      </Pressable>
    );
  };
  return (
    <Modal animationType="fade">
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            ui.page,
            layout.page,
            {
              paddingTop: Math.max(layout.wide ? 60 : 28, topInset + 28),
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
            Set your OLL & PLL starting point
          </Text>
          <Text style={[ui.subtitle, { marginVertical: 24 }]}>
            We’ll use your answers to tailor the cases you see in Train and show
            your progress in Algorithms. You can change what you’ve learned at
            any time.
          </Text>
          {(["OLL", "PLL"] as const).map((type) => (
            <View key={type} style={[ui.card, { marginBottom: 14 }]}>
              <Text style={[ui.title, { fontSize: 20, marginBottom: 8 }]}>
                Where are you with {type}?
              </Text>
              <View style={{ gap: 10 }}>
                {renderOption(type, options[0], true)}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {renderOption(type, options[1])}
                  {renderOption(type, options[2])}
                </View>
              </View>
            </View>
          ))}
          <Button title="Done" onPress={finish} />
        </ScrollView>
      </View>
    </Modal>
  );
}

