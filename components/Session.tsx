import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  Share,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Penalty, Solve, Store } from "../domain/models";
import { moveSolve, selectSolves, solveTitle } from "../domain/solveList";
import { best, formatTime } from "../domain/statistics";
import { CubeNet } from "./CubePreview";
import { Button, Sheet } from "./common";
import { color, ui } from "./theme";
import { useResponsiveLayout } from "./responsive";

const dateText = (date: number) =>
  new Date(date).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
const eventText = (event?: string) =>
  !event || event === "333" ? "3×3 Cube" : event;
export function SessionScreen({
  store,
  update,
}: {
  store: Store;
  update: (fn: (s: Store) => Store) => void;
}) {
  const layout = useResponsiveLayout();
  const solveColumns = layout.width >= 1000 ? 6 : layout.wide ? 5 : 3;
  const solveTileWidth =
    (layout.width - layout.padding * 2 - (solveColumns - 1) * 8) / solveColumns;
  const session =
    store.sessions.find((s) => s.id === store.activeSessionId) ??
    store.sessions[0];
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"date" | "time">("date");
  const [direction, setDirection] = useState<"ascending" | "descending">(
    "descending",
  );
  const [hasPenalty, setHasPenalty] = useState(false);
  const [hasComment, setHasComment] = useState(false);
  const [panel, setPanel] = useState<"filter" | "sessions" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [notice, setNotice] = useState("");
  const owner = store.sessions.find((s) =>
    s.solves.some((x) => x.id === selectedId),
  );
  const solve = owner?.solves.find((s) => s.id === selectedId);
  const visible = useMemo(
    () =>
      selectSolves(session.solves, {
        query,
        sort,
        direction,
        hasPenalty,
        hasComment,
      }),
    [session.solves, query, sort, direction, hasPenalty, hasComment],
  );
  const patch = (changes: Partial<Solve>) =>
    update((s) => ({
      ...s,
      sessions: s.sessions.map((x) =>
        x.id === owner?.id
          ? {
              ...x,
              solves: x.solves.map((v) =>
                v.id === selectedId ? { ...v, ...changes } : v,
              ),
            }
          : x,
      ),
      attempts: s.attempts.map((a) =>
        a.id === selectedId ? { ...a, ...changes } : a,
      ),
    }));
  const close = () => {
    Keyboard.dismiss();
    setSelectedId(null);
    setMoving(false);
    setNotice("");
  };
  const solveText = () =>
    solve && owner
      ? `${solveTitle(solve)}\n${eventText(owner.event)} · ${dateText(solve.createdAt)}\nScramble: ${solve.scramble}\nSession: ${owner.name}${solve.comment ? `\nComment: ${solve.comment}` : ""}`
      : "";
  const action = async (kind: "copy" | "share") => {
    Keyboard.dismiss();
    try {
      if (kind === "copy") {
        await Clipboard.setStringAsync(solveText());
        setNotice("Solve copied.");
      } else if (
        Platform.OS === "web" &&
        typeof navigator !== "undefined" &&
        navigator.share
      )
        await navigator.share({ text: solveText() });
      else if (Platform.OS === "web") {
        await Clipboard.setStringAsync(solveText());
        setNotice("Sharing is unavailable in this browser. Solve copied.");
      } else await Share.share({ message: solveText() });
    } catch {
      setNotice("Could not complete that action. Please try again.");
    }
  };
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        key={`solve-grid-${solveColumns}`}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        data={visible}
        numColumns={solveColumns}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        keyExtractor={(s) => s.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[ui.page, layout.page]}
        ListHeaderComponent={
          <>
            <View
              style={[
                ui.between,
                { alignItems: "flex-start", marginBottom: 18 },
              ]}
            >
              <View style={{ flexGrow: 1, flexShrink: 1 }}>
                <Pressable
                  onPress={() => setPanel("sessions")}
                  accessibilityRole="button"
                  accessibilityLabel="Choose session"
                  style={ui.row}
                >
                  <Text style={[ui.title, { flexShrink: 1 }]}>
                    {session.name}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={color.accent}
                  />
                </Pressable>
                <Text style={[ui.subtitle, { marginTop: 8 }]}>
                  {eventText(session.event)}
                </Text>
                <Text style={ui.subtitle}>
                  Created{" "}
                  {session.createdAt
                    ? dateText(session.createdAt)
                    : "date unavailable"}
                </Text>
              </View>
              <View
                style={{
                  flexGrow: 1,
                  maxWidth: layout.wide ? 370 : undefined,
                  width: layout.wide ? undefined : "100%",
                }}
              >
                <TextInput
                  accessibilityLabel="Search solves"
                  placeholder="Search times, scrambles, comments…"
                  placeholderTextColor={color.muted}
                  value={query}
                  onChangeText={setQuery}
                  style={[ui.input, { marginTop: 0 }]}
                />
                <View style={[ui.row, { justifyContent: "flex-end" }]}>
                  <Button
                    title={`Filter${hasPenalty || hasComment ? " •" : ""}`}
                    onPress={() => setPanel("filter")}
                  />
                  <Button
                    title={`Sort: ${sort === "date" ? "Date" : "Time"} ${direction === "descending" ? "↓" : "↑"}`}
                    onPress={() => setPanel("filter")}
                  />
                </View>
              </View>
            </View>
            <Text style={[ui.subtitle, { marginBottom: 16 }]}>
              {visible.length} of {session.solves.length} solves · Best{" "}
              {formatTime(best(session.solves))}
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={ui.card}>
            <Text style={ui.text}>
              {session.solves.length
                ? "No solves match your search and filters."
                : "Your solves will appear here after you use the timer."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View solve ${solveTitle(item)}`}
            onPress={() => {
              setSelectedId(item.id);
              setNotice("");
            }}
            style={[
              ui.card,
              {
                width: solveTileWidth,
                minHeight: 38,
                paddingHorizontal: 6,
                paddingVertical: 2,
                marginBottom: 6,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              style={[ui.text, { fontFamily: "Digital", fontSize: 20 }]}
            >
              {solveTitle(item)}
            </Text>
          </Pressable>
        )}
      />
      {panel === "sessions" && (
        <Sheet title="Choose session" onClose={() => setPanel(null)}>
          {store.sessions.map((s) => (
            <View key={s.id} style={{ marginBottom: 10 }}>
              <Button
                title={`${s.name}${s.id === session.id ? " ✓" : ""}`}
                onPress={() => {
                  update((state) => ({ ...state, activeSessionId: s.id }));
                  setPanel(null);
                }}
              />
            </View>
          ))}
        </Sheet>
      )}
      {panel === "filter" && (
        <Sheet title="Filter & sort" onClose={() => setPanel(null)}>
          <Text style={ui.label}>SORT BY</Text>
          <View style={ui.row}>
            {(["date", "time"] as const).map((v) => (
              <Choice
                key={v}
                label={v === "date" ? "Date" : "Solve time"}
                selected={sort === v}
                onPress={() => setSort(v)}
              />
            ))}
          </View>
          <Text style={[ui.label, { marginTop: 22 }]}>ORDER</Text>
          <View style={ui.row}>
            {(["ascending", "descending"] as const).map((v) => (
              <Choice
                key={v}
                label={v === "ascending" ? "Ascending" : "Descending"}
                selected={direction === v}
                onPress={() => setDirection(v)}
              />
            ))}
          </View>
          <View style={[ui.between, { marginTop: 22 }]}>
            <Text style={ui.text}>Has penalty (+2 or DNF)</Text>
            <Switch
              accessibilityLabel="Has penalty"
              value={hasPenalty}
              onValueChange={setHasPenalty}
            />
          </View>
          <View style={[ui.between, { marginVertical: 22 }]}>
            <Text style={ui.text}>Has comment</Text>
            <Switch
              accessibilityLabel="Has comment"
              value={hasComment}
              onValueChange={setHasComment}
            />
          </View>
          <Button title="Done" onPress={() => setPanel(null)} />
        </Sheet>
      )}
      {solve && owner && (
        <Sheet title={solveTitle(solve)} closeLabel="Done" onClose={close}>
          <View>
            <Text style={ui.subtitle}>{eventText(owner.event)}</Text>
            <Text style={ui.subtitle}>{dateText(solve.createdAt)}</Text>
            <Text style={[ui.label, { marginTop: 24 }]}>SCRAMBLE</Text>
            <Text selectable style={[ui.text, { lineHeight: 25 }]}>
              {solve.scramble}
            </Text>
            <Text style={[ui.label, { marginTop: 24 }]}>CUBE STATE</Text>
            <View style={[ui.card, { alignItems: "center" }]}>
              <CubeNet
                notation={solve.scramble}
                whiteTop
                size={Math.min(300, layout.width - layout.padding * 2 - 42)}
              />
            </View>
            <View style={[ui.row, { marginBottom: 20 }]}>
              {(["none", "+2", "DNF"] as Penalty[]).map((p) => (
                <Choice
                  key={p}
                  label={p === "none" ? "OK" : p}
                  selected={solve.penalty === p}
                  onPress={() => {
                    Keyboard.dismiss();
                    patch({ penalty: p });
                  }}
                />
              ))}
            </View>
            <View style={ui.row}>
              <Button title="Copy solve" onPress={() => void action("copy")} />
              <Button
                title="Share solve"
                onPress={() => void action("share")}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete solve"
                style={ui.chip}
                onPress={() => {
                  Keyboard.dismiss();
                  Alert.alert(
                    "Delete solve?",
                    "This solve will be permanently removed.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => {
                          update((s) => ({
                            ...s,
                            sessions: s.sessions.map((x) => ({
                              ...x,
                              solves: x.solves.filter(
                                (v) => v.id !== selectedId,
                              ),
                            })),
                            attempts: s.attempts.filter(
                              (a) => a.id !== selectedId,
                            ),
                          }));
                          close();
                        },
                      },
                    ],
                  );
                }}
              >
                <Ionicons name="trash-outline" size={22} color={color.red} />
              </Pressable>
            </View>
            {!!notice && (
              <Text
                accessibilityLiveRegion="polite"
                style={[ui.subtitle, { marginTop: 10 }]}
              >
                {notice}
              </Text>
            )}
            <View style={ui.divider} />
            <Text style={ui.label}>SESSION</Text>
            <View style={ui.between}>
              <Text style={ui.text}>{owner.name}</Text>
              <Button
                title="Move solve"
                onPress={() => {
                  Keyboard.dismiss();
                  setMoving(!moving);
                }}
              />
            </View>
            {moving && (
              <View style={{ gap: 10, marginTop: 14 }}>
                {store.sessions
                  .filter((s) => s.id !== owner.id)
                  .map((s) => (
                    <Button
                      key={s.id}
                      title={`Move to ${s.name}`}
                      onPress={() => {
                        update((state) => moveSolve(state, solve.id, s.id));
                        setMoving(false);
                        setNotice(`Moved to ${s.name}.`);
                      }}
                    />
                  ))}
                {store.sessions.length < 2 && (
                  <Text style={ui.subtitle}>
                    Create another session from the timer first.
                  </Text>
                )}
              </View>
            )}
            <View style={ui.divider} />
            <Text style={ui.label}>COMMENT</Text>
            <TextInput
              accessibilityLabel="Solve comment"
              multiline
              placeholder="Add a comment…"
              placeholderTextColor={color.muted}
              value={solve.comment ?? ""}
              onChangeText={(comment) => patch({ comment })}
              style={[ui.input, { minHeight: 110, textAlignVertical: "top" }]}
            />
            <Text style={ui.subtitle}>Comments save automatically.</Text>
          </View>
        </Sheet>
      )}
    </View>
  );
}
function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={[ui.chip, selected && ui.selected]}
      onPress={onPress}
    >
      <Text style={ui.text}>{label}</Text>
    </Pressable>
  );
}
