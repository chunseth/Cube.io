import { Text, View } from "react-native";
import { AverageRecord } from "../domain/progress";
import { formatAverage, resultMs } from "../domain/statistics";
import { solveTitle } from "../domain/solveList";
import { CubeNet } from "./CubePreview";
import { Sheet } from "./common";
import { color, ui } from "./theme";

export function ProgressDetails({
  record,
  window,
  practice,
  onClose,
}: {
  record: AverageRecord;
  window: number;
  practice: boolean;
  onClose: () => void;
}) {
  const title =
    window === 1
      ? "Best Single"
      : window === 3
        ? "Best Mo3"
        : `Best Ao${window}`;
  const maxTime = Math.max(
    1,
    ...record.entries
      .map(({ solve }) => resultMs(solve))
      .filter(Number.isFinite),
  );
  const trim = window === 3 ? 0 : Math.ceil(window * 0.05);
  return (
    <Sheet title={title} onClose={onClose} closeLabel="Done">
      <Text
        style={{
          fontFamily: "Digital",
          fontSize: 42,
          color: color.ink,
          marginBottom: 16,
        }}
      >
        {window === 1
          ? solveTitle(record.entries[0].solve)
          : formatAverage(record.value)}
      </Text>
      {window === 1 ? (
        <>
          <Text style={ui.label}>SCRAMBLE</Text>
          <Text
            selectable
            style={[ui.text, { lineHeight: 24, marginBottom: 16 }]}
          >
            {record.entries[0].solve.scramble}
          </Text>
          <View style={{ alignItems: "center" }}>
            <CubeNet
              notation={record.entries[0].solve.scramble}
              whiteTop={!practice}
              size={250}
            />
          </View>
        </>
      ) : (
        <>
          <Text style={[ui.subtitle, { marginBottom: 20 }]}>
            {window} consecutive solves, oldest first.
            {trim
              ? trim === 1
                ? " The fastest and slowest solves are excluded."
                : ` The fastest ${trim} and slowest ${trim} solves are excluded.`
              : " All three times count."}
          </Text>
          {record.entries.map(({ solve, solveNumber, excluded }) => (
            <View
              key={solve.id}
              style={{
                paddingVertical: 16,
                borderTopWidth: 1,
                borderTopColor: color.line,
              }}
            >
              <View style={ui.between}>
                <Text style={ui.subtitle}>Solve {solveNumber}</Text>
                <View style={ui.row}>
                  {excluded && <Text style={ui.badge}>Excluded</Text>}
                  <Text
                    style={{
                      fontFamily: "Digital",
                      fontSize: 26,
                      color: excluded ? color.muted : color.ink,
                    }}
                  >
                    {solveTitle(solve)}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  height: 4,
                  backgroundColor: color.blue,
                  borderRadius: 2,
                  marginVertical: 12,
                }}
              >
                <View
                  style={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: excluded ? color.muted : color.accent,
                    width: `${Number.isFinite(resultMs(solve)) ? (resultMs(solve) / maxTime) * 100 : 100}%`,
                    opacity: excluded ? 0.45 : 1,
                  }}
                />
              </View>
              <Text selectable style={[ui.text, { lineHeight: 23 }]}>
                {solve.scramble}
              </Text>
            </View>
          ))}
        </>
      )}
    </Sheet>
  );
}
