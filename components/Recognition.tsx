import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Case, Store, uid } from "../domain/models";
import { executionSetup, recognitionReady } from "../domain/content";
import { recognitionAnswers } from "../domain/recognition";
import { formatTime } from "../domain/statistics";
import { CaseImage, OllQuestion, PllQuestion } from "./CubePreview";
import { Button } from "./common";
import { color, ui } from "./theme";
function shuffled<T>(values: T[]): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function Recognition({
  item: initialItem,
  store,
  update,
  onExit,
}: {
  item: Case;
  store: Store;
  update: (fn: (s: Store) => Store) => void;
  onExit: () => void;
}) {
  const { height } = useWindowDimensions();
  const compact = height < 800;
  const [currentId, setCurrentId] = useState(initialItem.id);
  const [scramble, setScramble] = useState(() => executionSetup(initialItem));
  const [queue, setQueue] = useState(() =>
    shuffled(
      store.cases
        .filter(
          (c) =>
            c.type === initialItem.type &&
            c.id !== initialItem.id &&
            recognitionReady(c, store.cases),
        )
        .map((c) => c.id),
    ),
  );
  const item = store.cases.find((c) => c.id === currentId) ?? initialItem;
  const [mode, setMode] = useState<"full" | "two-sided">("two-sided"),
    [started, setStarted] = useState(false),
    [answer, setAnswer] = useState<string | null>(null),
    [time, setTime] = useState(0),
    [round, setRound] = useState(0);
  const start = useRef(0);
  useEffect(() => {
    if (started && !answer) start.current = performance.now();
  }, [started, round]);
  const correct = answer === item.id;
  const [order, setOrder] = useState(() =>
    shuffled(recognitionAnswers(initialItem, scramble, mode)),
  );
  return (
    <ScrollView contentContainerStyle={ui.page}>
      <Button title="‹ Back to training" onPress={onExit} />
      <Text style={[ui.title, { marginTop: 24 }]}>Recognition</Text>
      <Text style={[ui.subtitle, { marginTop: 8 }]}>
        {item.type} ·{" "}
        {mode === "full"
          ? "U face + all four sides"
          : "UFR · two-sided recognition"}
      </Text>
      {!started ? (
        <View style={[ui.card, { marginTop: 24 }]}>
          <Text style={[ui.subtitle, { marginBottom: 18 }]}>
            Identify the case as quickly as you can. One answer ends the
            attempt.
            {item.type === "OLL"
              ? " In two-sided mode, only U, F and R are visible. F2L is blank. Match the orientation to a full diagram; you may need to mentally rotate it."
              : " In two-sided mode, only U, F and R are visible. F2L is blank. Use the blocks, headlights and color relationships on F and R to choose the PLL name."}
          </Text>
          <View style={[ui.row, { marginBottom: 20 }]}>
            {(["full", "two-sided"] as const).map((m) => (
              <Pressable
                key={m}
                style={[ui.chip, mode === m && ui.selected]}
                onPress={() => {
                  setMode(m);
                  setOrder(shuffled(recognitionAnswers(item, scramble, m)));
                }}
              >
                <Text style={ui.text}>
                  {m === "full" ? "Full view" : "Two-sided"}
                </Text>
              </Pressable>
            ))}
          </View>
          <Button title="Begin recognition" onPress={() => setStarted(true)} />
        </View>
      ) : (
        <>
          {mode === "full" ? (
            <View style={{ alignItems: "center", marginVertical: 24 }}>
              <CaseImage
                setup={scramble}
                oll={item.type === "OLL"}
                size={252}
              />
            </View>
          ) : item.type === "OLL" ? (
            <View style={{ alignItems: "center", marginVertical: 12 }}>
              <OllQuestion setup={scramble} size={compact ? 216 : 252} />
            </View>
          ) : (
            <View style={{ alignItems: "center", marginVertical: 12 }}>
              <PllQuestion setup={scramble} size={compact ? 216 : 252} />
            </View>
          )}
          {answer && (
            <View
              style={[
                ui.card,
                { borderColor: correct ? color.green : color.red },
              ]}
            >
              <Text style={ui.text}>
                {correct ? "Correct" : `Correct answer: ${item.name}`} ·{" "}
                {formatTime(time)}
              </Text>
            </View>
          )}
          <View style={ui.grid}>
            {order
              .map((id) => store.cases.find((c) => c.id === id))
              .filter((c): c is Case => !!c)
              .map((c, index) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={c.name}
                  disabled={!!answer}
                  key={c.id}
                  style={[
                    ui.card,
                    { width: "47%", alignItems: "center", padding: 12 },
                    answer &&
                      c.id === item.id && { backgroundColor: "#173d33" },
                    answer === c.id &&
                      !correct && { backgroundColor: "#4b2531" },
                  ]}
                  onPress={() => {
                    const ms = performance.now() - start.current;
                    setTime(ms);
                    setAnswer(c.id);
                    update((s) => ({
                      ...s,
                      attempts: [
                        {
                          id: uid(),
                          caseId: item.id,
                          mode,
                          timeMs: ms,
                          scramble,
                          createdAt: Date.now(),
                          source: "timer",
                          penalty: "none",
                          correct: c.id === item.id,
                          answerId: c.id,
                        },
                        ...s.attempts,
                      ],
                    }));
                  }}
                >
                  {item.type === "OLL" ? (
                    <>
                      <Text style={[ui.badge, { marginBottom: 6 }]}>
                        {String.fromCharCode(65 + index)}
                      </Text>
                      <CaseImage
                        setup={c.setup}
                        size={compact ? 96 : 112}
                        imageId={c.imageId}
                      />
                    </>
                  ) : (
                    <>
                      <Text style={[ui.badge, { marginBottom: 8 }]}>
                        {String.fromCharCode(65 + index)}
                      </Text>
                      <Text
                        style={[
                          ui.text,
                          {
                            fontSize: 18,
                            fontWeight: "600",
                            paddingVertical: 12,
                          },
                        ]}
                      >
                        {c.name}
                      </Text>
                    </>
                  )}
                </Pressable>
              ))}
          </View>
          {answer && (
            <Button
              title="Next question"
              onPress={() => {
                const ready = store.cases.filter(
                  (c) =>
                    c.type === item.type && recognitionReady(c, store.cases),
                );
                const available = queue.filter((id) =>
                  ready.some((c) => c.id === id),
                );
                const deck = available.length
                  ? available
                  : shuffled(ready.map((c) => c.id));
                if (deck.length > 1 && deck[0] === item.id)
                  [deck[0], deck[1]] = [deck[1], deck[0]];
                const next = ready.find((c) => c.id === deck[0]) ?? item;
                setQueue(deck.slice(1));
                const nextScramble = executionSetup(next, scramble);
                setCurrentId(next.id);
                setScramble(nextScramble);
                setOrder(
                  shuffled(recognitionAnswers(next, nextScramble, mode)),
                );
                setAnswer(null);
                setRound((r) => r + 1);
              }}
            />
          )}
        </>
      )}
    </ScrollView>
  );
}
