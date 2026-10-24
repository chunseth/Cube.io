import { useState } from "react";
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
import { best, formatTime } from "../domain/statistics";
import { recognitionReady, validateContent } from "../domain/content";
import { verifySetup } from "../domain/lastLayer";
import { bundledById } from "../domain/catalog";
import { CaseImage, CubePreview } from "./CubePreview";
import { Button, Sheet } from "./common";
import { color, ui } from "./theme";
type Props = {
  store: Store;
  update: (fn: (s: Store) => Store) => void;
  onExecution: (c: Case) => void;
  onRecognition: (c: Case) => void;
  initialCase?: Case;
  onCloseCase?: () => void;
};
export function Algorithms({
  store,
  update,
  onExecution,
  onRecognition,
  initialCase,
  onCloseCase,
}: Props) {
  const [family, setFamily] = useState("All families");
  const [type, setType] = useState<"OLL" | "PLL">("OLL"),
    [filter, setFilter] = useState("All"),
    [search, setSearch] = useState("");
  const [caseId, setCaseId] = useState<string | null>(initialCase?.id ?? null),
    [custom, setCustom] = useState("");
  const [editor, setEditor] = useState(false),
    [json, setJson] = useState(""),
    [error, setError] = useState("");
  const item = store.cases.find((c) => c.id === caseId);
  const toggleLearned = (ids: string[]) =>
    update((s) => ({
      ...s,
      learned: ids.every((id) => s.learned.includes(id))
        ? s.learned.filter((id) => !ids.includes(id))
        : [...new Set([...s.learned, ...ids])],
    }));
  const openEditor = () => {
    setJson(JSON.stringify({ version: 1, cases: store.cases }, null, 2));
    setError("");
    setEditor(true);
  };
  return (
    <>
      <ScrollView contentContainerStyle={ui.page}>
        <View style={ui.between}>
          <Text style={ui.title}>Algorithms</Text>
          <Pressable onPress={openEditor}>
            <Text style={ui.badge}>Content editor</Text>
          </Pressable>
        </View>
        <Text style={[ui.subtitle, { marginTop: 6, marginBottom: 24 }]}>
          Build your last-layer repertoire.
        </Text>
        <View style={ui.row}>
          {(["OLL", "PLL"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => {
                setType(t);
                setFamily("All families");
              }}
              style={[ui.chip, type === t && ui.selected]}
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
        </View>
        <View style={[ui.row, { marginTop: 14 }]}>
          {["All", "Learned", "Unlearned"].map((f) => (
            <Pressable
              key={f}
              style={[ui.chip, filter === f && ui.selected]}
              onPress={() => setFilter(f)}
            >
              <Text style={ui.badge}>{f}</Text>
            </Pressable>
          ))}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 14 }}
        >
          <View style={ui.row}>
            {[
              "All families",
              ...new Set(
                store.cases.filter((c) => c.type === type).map((c) => c.family),
              ),
            ].map((f) => (
              <Pressable
                key={f}
                onPress={() => setFamily(f)}
                style={[ui.chip, family === f && ui.selected]}
              >
                <Text style={ui.badge}>{f}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <TextInput
          placeholderTextColor={color.muted}
          keyboardAppearance="dark"
          style={ui.input}
          placeholder="Search case or family"
          value={search}
          onChangeText={setSearch}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 18 }}
        >
          <View style={ui.row}>
            <Button
              title="Mark 2-look learned"
              onPress={() =>
                toggleLearned(
                  store.cases
                    .filter((c) => c.type === type && c.twoLook)
                    .map((c) => c.id),
                )
              }
            />
            {family !== "All families" && (
              <Button
                title="Toggle family learned"
                onPress={() =>
                  toggleLearned(
                    store.cases
                      .filter((c) => c.type === type && c.family === family)
                      .map((c) => c.id),
                  )
                }
              />
            )}
            <Button
              title="Toggle all learned"
              onPress={() =>
                toggleLearned(
                  store.cases.filter((c) => c.type === type).map((c) => c.id),
                )
              }
            />
          </View>
        </ScrollView>
        <View style={ui.grid}>
          {store.cases
            .filter(
              (c) =>
                c.type === type &&
                (family === "All families" || c.family === family) &&
                (filter === "All" ||
                  (filter === "Learned") === store.learned.includes(c.id)) &&
                `${c.name} ${c.family}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
            )
            .map((c) => (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                onPress={() => setCaseId(c.id)}
                style={[
                  ui.card,
                  { width: "47%", alignItems: "center", padding: 16 },
                  store.learned.includes(c.id) && { borderColor: color.green },
                ]}
              >
                <CaseImage
                  setup={c.setup}
                  oll={c.type === "OLL"}
                  imageId={c.imageId}
                />
                <Text style={[ui.text, { marginTop: 14, fontWeight: "600" }]}>
                  {c.name}
                  {store.learned.includes(c.id) ? " ✓" : ""}
                </Text>
                <Text style={[ui.badge, { marginTop: 6 }]}>{c.family}</Text>
              </Pressable>
            ))}
        </View>
      </ScrollView>
      {item && (
        <Sheet
          title={item.name}
          onClose={() => {
            setCaseId(null);
            onCloseCase?.();
          }}
        >
          <Text style={ui.subtitle}>
            {item.family}
            {item.twoLook ? " · 2-look" : ""}
          </Text>
          {item.setup ? (
            <View style={{ alignItems: "center", marginVertical: 24 }}>
              <CaseImage
                setup={item.setup}
                oll={item.type === "OLL"}
                size={224}
                imageId={item.imageId}
              />
              <Text
                style={[ui.subtitle, { marginTop: 12, textAlign: "center" }]}
              >
                U face + all four side rows · yellow up, green front
              </Text>
              {item.imageId && (
                <Text style={[ui.badge, { marginTop: 4 }]}>{item.imageId}</Text>
              )}
            </View>
          ) : (
            <View style={[ui.card, { marginTop: 20 }]}>
              <Text style={ui.subtitle}>
                Case visuals and training unlock when you add this case’s setup
                in the content editor.
              </Text>
            </View>
          )}
          <Button
            title={
              store.learned.includes(item.id)
                ? "✓ Learned · tap to unmark"
                : "Mark as learned"
            }
            onPress={() => toggleLearned([item.id])}
          />
          <View style={[ui.grid, { marginTop: 16 }]}>
            <Button
              title="Execution"
              disabled={!item.setup}
              onPress={() => onExecution(item)}
            />
            <Button
              title="Recognition"
              disabled={!recognitionReady(item, store.cases)}
              onPress={() => onRecognition(item)}
            />
          </View>
          <View style={[ui.grid, { marginVertical: 12 }]}>
            <Text style={ui.subtitle}>
              Execution PB{" "}
              {formatTime(
                best(
                  store.attempts.filter(
                    (a) => a.caseId === item.id && a.mode === "execution",
                  ),
                ),
              )}
            </Text>
            <Text style={ui.subtitle}>
              Recognition PB{" "}
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
          <Text style={[ui.label, { marginTop: 20 }]}>
            YOUR ALGORITHMS · SELECT ANY YOU USE
          </Text>
          {[...item.algorithms, ...(store.custom[item.id] ?? [])].map(
            (a, i) => (
              <Pressable
                key={`${a}-${i}`}
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
          <SetupCatalog item={item} />
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
    </>
  );
}
function SetupCatalog({ item }: { item: Case }) {
  const [kind, setKind] = useState("trainer"),
    [limit, setLimit] = useState(5);
  const setups = (item.setups ?? []).filter((s) => s.kind === kind);
  const signature = bundledById.get(item.id)?.signature;
  const primaryVerified =
    !!signature && verifySetup(item.setup, item.type, signature);
  return (
    <View style={{ marginTop: 28 }}>
      <Text style={ui.label}>SETUP SCRAMBLES · FROM A SOLVED CUBE</Text>
      <Text style={[ui.subtitle, { marginBottom: 10 }]}>
        {primaryVerified
          ? "F2L preserved · case verified"
          : "Setup not verified"}
        {item.type === "OLL"
          ? " · OLL orientation only; remaining PLL may vary."
          : " · Last layer oriented."}
      </Text>
      <View style={ui.card}>
        <Text selectable style={[ui.text, { lineHeight: 23 }]}>
          {item.setup}
        </Text>
        <Text style={[ui.badge, { marginTop: 8 }]}>Diagram setup</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 12 }}
      >
        <View style={ui.row}>
          {[
            ["trainer", "Trainer"],
            ["published", "Published"],
            ["inverse", "Alternatives"],
          ].map(([value, label]) => (
            <Pressable
              key={value}
              style={[ui.chip, kind === value && ui.selected]}
              onPress={() => {
                setKind(value);
                setLimit(5);
              }}
            >
              <Text style={ui.badge}>
                {label} ·{" "}
                {item.setups?.filter((s) => s.kind === value).length ?? 0}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      {setups.slice(0, limit).map((s) => (
        <View key={s.id} style={ui.card}>
          <Text selectable style={[ui.text, { lineHeight: 23 }]}>
            {s.moves}
          </Text>
          <Text style={[ui.badge, { marginTop: 10 }]}>
            {s.source === "jperm" ? "J Perm" : "SpeedCubeDB"}
            {s.kind === "inverse" ? " · derived by inverting an algorithm" : ""}
          </Text>
        </View>
      ))}
      {setups.length > limit && (
        <Button
          title={`Show more (${setups.length - limit} remaining)`}
          onPress={() => setLimit((n) => n + 10)}
        />
      )}
    </View>
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
      <ScrollView horizontal style={{ marginBottom: 20 }}>
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
