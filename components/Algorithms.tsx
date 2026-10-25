import { useResponsiveLayout } from "./responsive";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { AlgorithmAnimation } from "./AlgorithmAnimation";
import {
  Platform,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Case, Store } from "../domain/models";
import { UpdateStore } from "../domain/achievements";
import { best, formatTime } from "../domain/statistics";
import { recognitionReady, validateContent } from "../domain/content";
import { CaseImage, CubePreview } from "./CubePreview";
import { Button, Sheet } from "./common";
import { color, ui } from "./theme";
const categoryChip = {
  minHeight: 32,
  paddingVertical: 6,
  justifyContent: "center" as const,
};

export type AlgorithmViewState = {
  type: "OLL" | "PLL";
  filter: string;
  family: string;
  pbSort: "fastest" | "slowest" | null;
};
type Props = {
  store: Store;
  update: UpdateStore;
  onExecution: (c: Case) => void;
  onRecognition: (c: Case) => void;
  initialCase?: Case;
  initialView?: AlgorithmViewState;
  onViewChange?: (view: AlgorithmViewState) => void;
  onCloseCase?: () => void;
};
export function Algorithms({
  store,
  update,
  onExecution,
  onRecognition,
  initialCase,
  initialView,
  onViewChange,
  onCloseCase,
}: Props) {
  const layout = useResponsiveLayout();
  const [preview, setPreview] = useState<{
    algorithm: string;
    type: "OLL" | "PLL";
  } | null>(null);
  const [type, setType] = useState<"OLL" | "PLL">(initialView?.type ?? "OLL"),
    [filter, setFilter] = useState(initialView?.filter ?? "All"),
    [family, setFamily] = useState(initialView?.family ?? "none"),
    [pbSort, setPbSort] = useState<"fastest" | "slowest" | null>(
      initialView?.pbSort ?? null,
    ),
    [sortPicker, setSortPicker] = useState(false),
    [settings, setSettings] = useState(false),
    [bulk, setBulk] = useState(false),
    [bulkLearned, setBulkLearned] = useState<string[]>([]);
  const [caseId, setCaseId] = useState<string | null>(initialCase?.id ?? null),
    [custom, setCustom] = useState("");
  const [editor, setEditor] = useState(false),
    [json, setJson] = useState(""),
    [error, setError] = useState("");
  const item = store.cases.find((c) => c.id === caseId);
  useEffect(() => {
    onViewChange?.({ type, filter, family, pbSort });
  }, [type, filter, family, pbSort, onViewChange]);
  const executionPb = (caseId: string) =>
    best(
      store.attempts.filter(
        (attempt) => attempt.caseId === caseId && attempt.mode === "execution",
      ),
    );
  const toggleLearned = (ids: string[]) =>
    update(
      (s) => ({
        ...s,
        learned: ids.every((id) => s.learned.includes(id))
          ? s.learned.filter((id) => !ids.includes(id))
          : [...new Set([...s.learned, ...ids])],
      }),
      { learning: "learn" },
    );
  const openEditor = () => {
    setJson(JSON.stringify({ version: 1, cases: store.cases }, null, 2));
    setError("");
    setEditor(true);
  };
  const casesForType = store.cases.filter((c) => c.type === type);
  const learnedCount = casesForType.filter((c) =>
    store.learned.includes(c.id),
  ).length;
  const partial = learnedCount > 0 && learnedCount < casesForType.length;
  const allFamilies =
    type === "OLL"
      ? [...new Set(casesForType.map((c) => c.family))]
      : ["A", "E", "F", "G", "H", "J", "N", "R", "T", "U", "V", "Y", "Z"];
  const categoryKey = (value: string) => value;
  const familyLabel = (value: string) =>
    type === "OLL" ? value.replace(/\s*shapes?\b/gi, "").trim() : value;
  const visible = casesForType.filter(
    (c) =>
      (filter === "All" ||
        (filter === "2 Look"
          ? type === "OLL"
            ? c.family === "Cross"
            : c.name.startsWith("A") || c.name.startsWith("U")
          : (filter === "Learned") === store.learned.includes(c.id))) &&
      (family === "all" ||
        family === "two-look" ||
        (type === "OLL"
          ? c.family === family
          : c.name.startsWith(categoryKey(family)))),
  );
  const groups =
    type === "OLL"
      ? [...new Set(visible.map((c) => c.family))]
      : allFamilies.filter((group) =>
          visible.some((c) => c.name.startsWith(categoryKey(group))),
        );
  const sortByPb = (cases: Case[]) =>
    [...cases].sort((a, b) => {
      const aPb = executionPb(a.id);
      const bPb = executionPb(b.id);
      if (aPb === null) return bPb === null ? a.name.localeCompare(b.name) : 1;
      if (bPb === null) return -1;
      return pbSort === "fastest" ? aPb - bPb : bPb - aPb;
    });
  const caseGroups = pbSort
    ? [
        {
          title: `PB · ${pbSort === "fastest" ? "fastest first" : "slowest first"}`,
          cases: sortByPb(visible),
        },
      ]
    : groups.map((group) => ({
        title: type === "OLL" ? group : `${group} Perms`,
        cases: visible.filter((c) =>
          type === "OLL"
            ? c.family === group
            : c.name.startsWith(categoryKey(group)),
        ),
      }));
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          ui.page,
          layout.page,
          bulk && { paddingBottom: 96 },
        ]}
      >
        <View style={ui.between}>
          <Text style={ui.title}>Algorithms</Text>
        </View>
        <View style={[ui.row, { alignItems: "stretch", marginTop: 20 }]}>
          {(["OLL", "PLL"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => {
                setType(t);
                setFilter("All");
                setFamily("none");
                setPbSort(null);
              }}
              style={[
                ui.chip,
                { flex: 1, alignItems: "center" },
                type === t && ui.selected,
              ]}
            >
              <Text style={ui.text}>
                {t} ·{" "}
                {
                  store.learned.filter((id) =>
                    store.cases.some((c) => c.id === id && c.type === t),
                  ).length
                }
                /{t === "OLL" ? 57 : 21}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setSettings(true)}
            style={ui.chip}
            accessibilityLabel="Learning settings"
          >
            <Ionicons name="settings-outline" size={21} color={color.accent} />
          </Pressable>
        </View>
        <View style={[ui.grid, { marginTop: 14 }]}>
          <Pressable
            onPress={() => {
              setFamily("all");
              setFilter("All");
              setPbSort(null);
            }}
            style={[ui.chip, categoryChip, family === "all" && ui.selected]}
          >
            <Text style={ui.badge}>All {type}</Text>
          </Pressable>
          {["2 Look", ...(partial ? ["Learned", "Unlearned"] : [])].map((f) => (
            <Pressable
              key={f}
              style={[ui.chip, categoryChip, filter === f && ui.selected]}
              onPress={() => {
                setPbSort(null);
                if (f === "2 Look") {
                  const deselect = filter === "2 Look";
                  setFilter(deselect ? "All" : "2 Look");
                  setFamily(deselect ? "none" : "two-look");
                } else {
                  setFilter(f);
                  if (family === "two-look") setFamily("all");
                }
              }}
            >
              <Text style={ui.badge}>{f}</Text>
            </Pressable>
          ))}
          {allFamilies.map((name) => (
            <Pressable
              key={name}
              onPress={() => {
                setFamily(name);
                setPbSort(null);
                if (filter === "2 Look") setFilter("All");
              }}
              style={[ui.chip, categoryChip, family === name && ui.selected]}
            >
              <Text style={ui.badge}>{familyLabel(name)}</Text>
            </Pressable>
          ))}
        </View>
        <View style={[ui.row, { marginTop: 10, zIndex: 4 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sort cases by personal best"
            onPress={() => setSortPicker((open) => !open)}
            style={[ui.chip, categoryChip]}
          >
            <Ionicons name="filter-outline" size={17} color={color.muted} />
          </Pressable>
          {sortPicker && (
            <View
              style={{
                position: "absolute",
                top: 42,
                left: 0,
                width: 190,
                padding: 8,
                gap: 4,
                backgroundColor: color.surface,
                borderColor: color.line,
                borderWidth: 1,
                borderRadius: 12,
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.16,
                shadowRadius: 10,
                elevation: 8,
              }}
            >
              {pbSort && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setPbSort(null);
                    setSortPicker(false);
                  }}
                  style={{ paddingHorizontal: 10, paddingVertical: 8 }}
                >
                  <Text style={ui.badge}>Remove filter</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setPbSort("fastest");
                  setSortPicker(false);
                }}
                style={{ paddingHorizontal: 10, paddingVertical: 8 }}
              >
                <Text style={ui.badge}>Fastest to slowest</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setPbSort("slowest");
                  setSortPicker(false);
                }}
                style={{ paddingHorizontal: 10, paddingVertical: 8 }}
              >
                <Text style={ui.badge}>Slowest to fastest</Text>
              </Pressable>
            </View>
          )}
        </View>
        {caseGroups.map((group) => (
          <View key={group.title} style={{ marginTop: 18 }}>
            <Text style={[ui.label, { fontSize: 15, marginBottom: 8 }]}>
              {group.title}
            </Text>
            <View style={ui.grid}>
              {group.cases.map((c) => (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  onPress={() =>
                    bulk
                      ? setBulkLearned((ids) =>
                          ids.includes(c.id)
                            ? ids.filter((id) => id !== c.id)
                            : [...ids, c.id],
                        )
                      : setCaseId(c.id)
                  }
                  style={[
                    ui.card,
                    {
                      width: layout.cardWidth,
                      alignItems: "center",
                      padding: c.type === "OLL" ? 12 : 16,
                      marginBottom: c.type === "OLL" ? 4 : 14,
                    },
                    (bulk
                      ? bulkLearned.includes(c.id)
                      : store.learned.includes(c.id)) && {
                      borderColor: color.green,
                    },
                  ]}
                >
                  <CaseImage
                    setup={c.setup}
                    oll={c.type === "OLL"}
                    imageId={c.imageId}
                    size={Math.min(104, layout.cardWidth - 34)}
                  />
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Mark ${c.name} as learned`}
                    accessibilityState={{
                      checked: bulk
                        ? bulkLearned.includes(c.id)
                        : store.learned.includes(c.id),
                    }}
                    onPress={() =>
                      bulk
                        ? setBulkLearned((ids) =>
                            ids.includes(c.id)
                              ? ids.filter((id) => id !== c.id)
                              : [...ids, c.id],
                          )
                        : toggleLearned([c.id])
                    }
                    style={{ position: "absolute", top: 8, right: 8 }}
                  >
                    <Ionicons
                      name={
                        (
                          bulk
                            ? bulkLearned.includes(c.id)
                            : store.learned.includes(c.id)
                        )
                          ? "checkmark-circle"
                          : "ellipse-outline"
                      }
                      size={23}
                      color={
                        (
                          bulk
                            ? bulkLearned.includes(c.id)
                            : store.learned.includes(c.id)
                        )
                          ? color.green
                          : color.muted
                      }
                    />
                  </Pressable>
                  <Text style={[ui.text, { marginTop: 14, fontWeight: "600" }]}>
                    {c.name}
                    {(
                      bulk
                        ? bulkLearned.includes(c.id)
                        : store.learned.includes(c.id)
                    )
                      ? " ✓"
                      : ""}
                  </Text>
                  <Text style={[ui.badge, { marginTop: 4 }]}>
                    PB {formatTime(executionPb(c.id))}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
      {bulk && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: 14,
            backgroundColor: color.surface,
            borderTopWidth: 1,
            borderColor: color.line,
          }}
        >
          <View style={ui.row}>
            <View style={{ flex: 1 }}>
              <Button
                title="Save"
                onPress={() => {
                  update(
                    (s) => ({
                      ...s,
                      learned: [
                        ...s.learned.filter(
                          (id) => !casesForType.some((c) => c.id === id),
                        ),
                        ...bulkLearned,
                      ],
                    }),
                    { learning: "setup" },
                  );
                  setBulk(false);
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Cancel" onPress={() => setBulk(false)} />
            </View>
          </View>
        </View>
      )}
      {item && (
        <Sheet
          title={item.name}
          overlay={
            preview && (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  right: 0,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "#00000088",
                  padding: 20,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close algorithm preview"
                  onPress={() => setPreview(null)}
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                  }}
                />
                <View
                  onStartShouldSetResponder={() => true}
                  style={{
                    width: "100%",
                    maxWidth: 420,
                    borderRadius: 24,
                    padding: 20,
                    backgroundColor: color.surface,
                    borderWidth: 1,
                    borderColor: color.line,
                    elevation: 12,
                    boxShadow: "0 12px 40px #00000066",
                  }}
                >
                  <Text style={[ui.label, { textAlign: "center" }]}>
                    {item.name} · Algorithm preview
                  </Text>
                  <AlgorithmAnimation
                    algorithm={preview.algorithm}
                    type={preview.type}
                  />
                </View>
              </View>
            )
          }
          onClose={() => {
            setPreview(null);
            setCaseId(null);
            onCloseCase?.();
          }}
        >
          {item.type === "OLL" && (
            <Text style={ui.subtitle}>
              {item.family}
              {item.twoLook ? " · 2-look" : ""}
            </Text>
          )}
          {item.setup ? (
            <View style={{ alignItems: "center", marginVertical: 24 }}>
              <CaseImage
                setup={item.setup}
                oll={item.type === "OLL"}
                size={224}
                imageId={item.imageId}
              />
            </View>
          ) : (
            <View style={[ui.card, { marginTop: 20 }]}>
              <Text style={ui.subtitle}>
                Case visuals and training unlock when you add this case’s setup
                in the content editor.
              </Text>
            </View>
          )}
          <View
            style={{
              width: "100%",
              maxWidth: 600,
              alignSelf: "center",
              marginTop: 16,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                store.learned.includes(item.id) ? "Learned" : "Unlearned"
              }
              onPress={() => toggleLearned([item.id])}
              style={[
                ui.button,
                {
                  width: "100%",
                  backgroundColor: store.learned.includes(item.id)
                    ? color.green
                    : color.red,
                },
              ]}
            >
              <Text style={ui.buttonText}>
                {store.learned.includes(item.id) ? "✓ Learned" : "Unlearned"}
              </Text>
            </Pressable>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 10,
                gap: 16,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Practice this Case"
                disabled={!item.setup}
                onPress={() => onExecution(item)}
                style={[
                  ui.button,
                  { width: "47%", maxWidth: 240 },
                  !item.setup && { opacity: 0.4 },
                ]}
              >
                <Text style={ui.buttonText}>Practice this Case</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Practice Recognizing"
                disabled={!recognitionReady(item, store.cases)}
                onPress={() => onRecognition(item)}
                style={[
                  ui.button,
                  { width: "47%", maxWidth: 240 },
                  !recognitionReady(item, store.cases) && { opacity: 0.4 },
                ]}
              >
                <Text style={ui.buttonText}>Practice Recognizing</Text>
              </Pressable>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 8,
              }}
            >
              <Text
                style={[
                  ui.subtitle,
                  { width: "47%", maxWidth: 240, textAlign: "center" },
                ]}
              >
                PB{" "}
                {formatTime(
                  best(
                    store.attempts.filter(
                      (a) => a.caseId === item.id && a.mode === "execution",
                    ),
                  ),
                )}
              </Text>
              <Text
                style={[
                  ui.subtitle,
                  { width: "47%", maxWidth: 240, textAlign: "center" },
                ]}
              >
                PB{" "}
                {formatTime(
                  best(
                    store.attempts.filter(
                      (a) =>
                        a.caseId === item.id &&
                        a.mode !== "execution" &&
                        a.correct,
                    ),
                  ),
                )}
              </Text>
            </View>
          </View>
          <Text style={[ui.label, { marginTop: 32 }]}>
            YOUR ALGORITHMS · SELECT ANY YOU USE
          </Text>
          <Text style={[ui.label, { fontSize: 14, marginBottom: 12 }]}>
            HOLD AN ALGORITHM TO WATCH ITS MOVES
          </Text>
          {[...item.algorithms, ...(store.custom[item.id] ?? [])].map(
            (a, i) => (
              <Pressable
                key={`${a}-${i}`}
                accessibilityRole="button"
                accessibilityLabel={`${a}. Tap to select, hold to animate.`}
                delayLongPress={350}
                onLongPress={() =>
                  setPreview({ algorithm: a, type: item.type })
                }
                onPress={() =>
                  update((s) => ({
                    ...s,
                    selected: {
                      ...s.selected,
                      [item.id]: (s.selected[item.id] ?? []).includes(a)
                        ? (s.selected[item.id] ?? []).filter((x) => x !== a)
                        : [...(s.selected[item.id] ?? []), a],
                    },
                  }))
                }
                style={[
                  ui.card,
                  (store.selected[item.id] ?? []).includes(a) && ui.selected,
                ]}
              >
                <Text style={[ui.text, { lineHeight: 24 }]}>
                  {a}
                  {(store.selected[item.id] ?? []).includes(a) ? " ✓" : ""}
                </Text>
                <Text style={[ui.subtitle, { fontSize: 11, marginTop: 6 }]}>
                  {[
                    ...new Set(
                      item.algorithmSources
                        ?.filter((s) => s.moves === a)
                        .map((s) =>
                          s.source === "jperm" ? "J Perm" : "SpeedCubeDB",
                        ) ?? [],
                    ),
                  ].join(" · ") || "Your algorithm"}
                </Text>
              </Pressable>
            ),
          )}
          {!item.algorithms.length && (
            <Text style={ui.subtitle}>No built-in algorithms entered yet.</Text>
          )}
          <TextInput
            placeholderTextColor={color.muted}
            keyboardAppearance="dark"
            style={ui.input}
            placeholder="Add your own algorithm"
            value={custom}
            onChangeText={setCustom}
          />
          <Button
            title="Add algorithm"
            disabled={!custom.trim()}
            onPress={() => {
              update((s) => ({
                ...s,
                custom: {
                  ...s.custom,
                  [item.id]: [...(s.custom[item.id] ?? []), custom.trim()],
                },
                selected: {
                  ...s.selected,
                  [item.id]: [...(s.selected[item.id] ?? []), custom.trim()],
                },
              }));
              setCustom("");
            }}
          />
          {!!item.sources?.length && (
            <View style={{ gap: 10, marginTop: 20 }}>
              <Text style={ui.label}>REFERENCES</Text>
              {item.sources.map((source) => (
                <Pressable
                  key={source.url}
                  accessibilityRole="link"
                  onPress={() => Linking.openURL(source.url)}
                >
                  <Text style={ui.badge}>{source.name} ↗</Text>
                </Pressable>
              ))}
            </View>
          )}
        </Sheet>
      )}
      {editor && (
        <ContentEditor
          store={store}
          update={update}
          json={json}
          setJson={setJson}
          error={error}
          setError={setError}
          onClose={() => setEditor(false)}
        />
      )}
      {settings && (
        <LearningSettings
          type={type}
          cases={casesForType}
          learned={store.learned}
          onClose={() => setSettings(false)}
          onBulk={() => {
            setBulkLearned(
              casesForType
                .filter((c) => store.learned.includes(c.id))
                .map((c) => c.id),
            );
            setSettings(false);
            setBulk(true);
          }}
          update={update}
        />
      )}
    </View>
  );
}
function LearningSettings({
  type,
  cases,
  learned,
  update,
  onClose,
  onBulk,
}: {
  type: "OLL" | "PLL";
  cases: Case[];
  learned: string[];
  update: Props["update"];
  onClose: () => void;
  onBulk: () => void;
}) {
  const [error, setError] = useState("");
  const twoLook = cases.filter((c) => c.twoLook).map((c) => c.id);
  const allIds = cases.map((c) => c.id);
  const allLearned = allIds.every((id) => learned.includes(id));
  const twoLookLearned = twoLook.every((id) => learned.includes(id));
  const setGroup = (ids: string[], value: boolean) =>
    update(
      (s) => ({
        ...s,
        learned: value
          ? [...new Set([...s.learned, ...ids])]
          : s.learned.filter((id) => !ids.includes(id)),
      }),
      { learning: "setup" },
    );
  return (
    <Sheet title={`${type} learning settings`} onClose={onClose}>
      <Text style={[ui.subtitle, { marginBottom: 18 }]}>
        Choose a preset or fine-tune the cases you want to retain in your
        practice list.
      </Text>
      <Button
        title={twoLookLearned ? "Mark 2-look unlearned" : "Mark 2-look learned"}
        onPress={() => {
          if (allLearned && twoLookLearned) {
            setError(
              "Mark all cases unlearned first; a complete set cannot have 2-look removed on its own.",
            );
            return;
          }
          setGroup(twoLook, !twoLookLearned);
          setError("");
        }}
      />
      <View style={{ height: 12 }} />
      <Button
        title={allLearned ? "Mark all unlearned" : "Mark all learned"}
        onPress={() => {
          setGroup(allIds, !allLearned);
          setError("");
        }}
      />
      {error ? (
        <Text style={[ui.error, { marginTop: 12 }]}>{error}</Text>
      ) : null}
      <View style={ui.divider} />
      <Button title="Select multiple learned" onPress={onBulk} />
    </Sheet>
  );
}
function ContentEditor({
  store,
  update,
  json,
  setJson,
  error,
  setError,
  onClose,
}: {
  store: Store;
  update: Props["update"];
  json: string;
  setJson: (s: string) => void;
  error: string;
  setError: (s: string) => void;
  onClose: () => void;
}) {
  const [id, setId] = useState(store.cases[0].id);
  const [draft, setDraft] = useState({ ...store.cases[0] });
  const [algorithms, setAlgorithms] = useState(draft.algorithms.join("\n")),
    [answers, setAnswers] = useState(draft.answers.join(", "));
  const [raw, setRaw] = useState(false);
  const apply = () => {
    try {
      const c = {
        ...draft,
        algorithms: algorithms
          .split("\n")
          .map((a) => a.trim())
          .filter(Boolean),
        answers: answers
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
      };
      c.algorithmSources = c.algorithmSources?.filter((s) =>
        c.algorithms.includes(s.moves),
      );
      const cases = validateContent(
        { version: 1, cases: store.cases.map((x) => (x.id === id ? c : x)) },
        store.cases,
      );
      update((s) => ({ ...s, cases }));
      setError(
        "Saved on this device. Export the JSON to bundle it with the app.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid content");
    }
  };
  return (
    <Sheet title="Content studio" onClose={onClose}>
      <Text style={[ui.subtitle, { marginBottom: 18 }]}>
        Author the 78 case records on desktop or phone. Setup moves must lead
        from solved to the target case, with yellow on top and green in front.
        Recognition choices use case IDs.
      </Text>
      <ScrollView
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        horizontal
        style={{ marginBottom: 20 }}
      >
        <View style={ui.row}>
          {store.cases.map((c) => (
            <Pressable
              key={c.id}
              style={[ui.chip, id === c.id && ui.selected]}
              onPress={() => {
                setId(c.id);
                setDraft({ ...c });
                setAlgorithms(c.algorithms.join("\n"));
                setAnswers(c.answers.join(", "));
                setError("");
              }}
            >
              <Text style={ui.badge}>{c.name}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <Text style={ui.label}>{id}</Text>
      <TextInput
        placeholderTextColor={color.muted}
        keyboardAppearance="dark"
        accessibilityLabel="Case name"
        style={ui.input}
        value={draft.name}
        onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
      />
      <TextInput
        placeholderTextColor={color.muted}
        keyboardAppearance="dark"
        accessibilityLabel="Family"
        style={ui.input}
        value={draft.family}
        onChangeText={(family) => setDraft((d) => ({ ...d, family }))}
      />
      <Button
        title={draft.twoLook ? "✓ In 2-look preset" : "Add to 2-look preset"}
        onPress={() => setDraft((d) => ({ ...d, twoLook: !d.twoLook }))}
      />
      <Text style={[ui.label, { marginTop: 20 }]}>SETUP SCRAMBLE</Text>
      <TextInput
        placeholderTextColor={color.muted}
        keyboardAppearance="dark"
        style={ui.input}
        value={draft.setup}
        onChangeText={(setup) => setDraft((d) => ({ ...d, setup }))}
        placeholder="Moves from solved to this case"
      />
      <Text style={ui.label}>ALGORITHMS · ONE PER LINE</Text>
      <TextInput
        placeholderTextColor={color.muted}
        keyboardAppearance="dark"
        multiline
        style={[ui.input, { minHeight: 100 }]}
        value={algorithms}
        onChangeText={setAlgorithms}
      />
      <Text style={ui.label}>RECOGNITION ANSWER IDS · COMMA SEPARATED</Text>
      <TextInput
        placeholderTextColor={color.muted}
        keyboardAppearance="dark"
        style={ui.input}
        value={answers}
        onChangeText={setAnswers}
        placeholder="pll-t, pll-jb, pll-y, pll-rb"
      />
      <Button title="Save case" onPress={apply} />
      {error ? (
        <Text style={[ui.subtitle, { marginVertical: 12 }]}>{error}</Text>
      ) : null}
      <View style={ui.divider} />
      <Button
        title={raw ? "Hide JSON import / export" : "JSON import / export"}
        onPress={() => {
          setJson(JSON.stringify({ version: 1, cases: store.cases }, null, 2));
          setRaw(!raw);
        }}
      />
      {raw && (
        <>
          <TextInput
            placeholderTextColor={color.muted}
            keyboardAppearance="dark"
            multiline
            accessibilityLabel="Content JSON"
            style={[
              ui.input,
              { minHeight: 260, fontSize: 11, fontFamily: "Digital" },
            ]}
            value={json}
            onChangeText={setJson}
          />
          <View style={ui.row}>
            <Button
              title="Import JSON"
              onPress={() => {
                try {
                  const cases = validateContent(JSON.parse(json), store.cases);
                  update((s) => ({ ...s, cases }));
                  setError("Content imported.");
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Invalid JSON");
                }
              }}
            />
            {Platform.OS === "web" && (
              <Button
                title="Download JSON"
                onPress={() => {
                  const blob = new Blob(
                    [
                      JSON.stringify(
                        { version: 1, cases: store.cases },
                        null,
                        2,
                      ),
                    ],
                    { type: "application/json" },
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "cubeio-content.json";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              />
            )}
          </View>
        </>
      )}
    </Sheet>
  );
}
