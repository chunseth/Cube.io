import { useResponsiveLayout } from "./responsive";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { Case, Store, uid } from "../domain/models";
import { executionSetup } from "../domain/content";
import { recognitionAnswers, recognitionCases } from "../domain/recognition";
import { formatTime } from "../domain/statistics";
import {
  CaseImage,
  OllQuestion,
  PllQuestion,
  RotatingRecognitionCube,
} from "./CubePreview";
import { BackButton } from "./common";
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
  scope = "type",
  initialMode = "two-sided",
  store,
  update,
  onExit,
}: {
  item: Case;
  scope?: "single" | "family" | "type";
  initialMode?: "full" | "two-sided";
  store: Store;
  update: (fn: (s: Store) => Store) => void;
  onExit: () => void;
}) {
  const layout = useResponsiveLayout();
  const { height } = useWindowDimensions();
  const [availableHeight, setAvailableHeight] = useState(height - 80);
  const eligible = () =>
    recognitionCases(store.cases, store.learned, initialItem, scope);
  const [currentId, setCurrentId] = useState(initialItem.id);
  const [scramble, setScramble] = useState(() => executionSetup(initialItem));
  const [queue, setQueue] = useState(() =>
    shuffled(
      eligible()
        .filter((c) => c.id !== initialItem.id)
        .map((c) => c.id),
    ),
  );
  const item = store.cases.find((c) => c.id === currentId) ?? initialItem;
  const mode = initialMode;
  const [answer, setAnswer] = useState<string | null>(null),
    [time, setTime] = useState(0),
    [round, setRound] = useState(0);
  const start = useRef(0);
  useEffect(() => {
    start.current = performance.now();
  }, [round]);
  const correct = answer === item.id;
  const [order, setOrder] = useState(() =>
    shuffled(recognitionAnswers(initialItem, scramble, mode)),
  );
  const nextQuestion = () => {
    const ready = eligible();
    const available = queue.filter((id) => ready.some((c) => c.id === id));
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
    setOrder(shuffled(recognitionAnswers(next, nextScramble, mode)));
    setAnswer(null);
    setRound((r) => r + 1);
  };
  // Reserve feedback and continuation space before an answer is selected.
  const columns = availableHeight < 450 && layout.width > 500 ? 4 : 2;
  const rows = Math.ceil(order.length / columns);
  const contentWidth = layout.width - layout.padding * 2;
  const cellWidth = Math.min(
    240,
    (contentWidth - (columns - 1) * 10) / columns,
  );
  const imageSize = Math.max(
    16,
    Math.min(112, cellWidth - 24, (availableHeight - 192) / (rows + 2.2) - 36),
  );
  const cubeSize = Math.max(
    32,
    Math.min(
      252,
      contentWidth,
      availableHeight -
        192 -
        rows * (item.type === "OLL" ? imageSize + 40 : 66) -
        (rows - 1) * 10,
    ),
  );
  return (
    <View
      onLayout={(event) => setAvailableHeight(event.nativeEvent.layout.height)}
      style={{ flex: 1, paddingHorizontal: layout.padding, paddingVertical: 8 }}
    >
      <View
        style={{
          position: "absolute",
          top: 8,
          left: layout.padding,
          zIndex: 3,
        }}
      >
        <BackButton onPress={onExit} />
      </View>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        {mode === "full" ? (
          <View
            style={{ alignItems: "center", marginTop: 48, marginBottom: 4 }}
          >
            <RotatingRecognitionCube
              key={`${round}-${currentId}`}
              setup={scramble}
              oll={item.type === "OLL"}
              size={cubeSize}
            />
          </View>
        ) : item.type === "OLL" ? (
          <View
            style={{ alignItems: "center", marginTop: 48, marginBottom: 4 }}
          >
            <OllQuestion setup={scramble} size={cubeSize} />
          </View>
        ) : (
          <View
            style={{ alignItems: "center", marginTop: 48, marginBottom: 4 }}
          >
            <PllQuestion setup={scramble} size={cubeSize} />
          </View>
        )}
        <View style={{ height: 40, justifyContent: "center" }}>
          {answer && (
            <Text
              style={[ui.text, { color: correct ? color.green : color.red }]}
            >
              {correct ? "Correct" : `Correct answer: ${item.name}`} ·{" "}
              {formatTime(time)}
            </Text>
          )}
        </View>
        <View
          style={[
            ui.grid,
            {
              width: cellWidth * columns + (columns - 1) * 10,
              justifyContent: "center",
            },
          ]}
        >
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
                  {
                    width: cellWidth,
                    alignItems: "center",
                    padding: 8,
                    marginBottom: 0,
                  },
                  answer && c.id === item.id && { backgroundColor: "#173d33" },
                  answer === c.id && !correct && { backgroundColor: "#4b2531" },
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
                      size={imageSize}
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
                          fontSize: 16,
                          fontWeight: "600",
                          paddingVertical: 4,
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
      </View>
      <View
        style={{ height: 44, justifyContent: "center", alignItems: "center" }}
      >
        {answer && (
          <Text style={[ui.subtitle, { color: color.accent }]}>
            Tap anywhere to continue ...
          </Text>
        )}
      </View>
      {answer && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tap anywhere to continue"
          onPress={nextQuestion}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 2,
          }}
        />
      )}
    </View>
  );
}
