import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { ui, color } from "./theme";
export function Button({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={[ui.button, disabled && { opacity: 0.4 }]}
    >
      <Text style={ui.buttonText}>{title}</Text>
    </Pressable>
  );
}
export function Sheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          backgroundColor: "#00000088",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          accessibilityLabel="Close dialog"
          style={{ flex: 1 }}
          onPress={onClose}
        />
        <View
          style={{
            backgroundColor: color.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 22,
            maxHeight: "88%",
            width: "100%",
            maxWidth: 760,
            alignSelf: "center",
          }}
        >
          <View style={[ui.between, { marginBottom: 22 }]}>
            <Text style={[ui.title, { fontSize: 22 }]}>{title}</Text>
            <Pressable onPress={onClose} accessibilityRole="button">
              <Text style={ui.badge}>Done</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: "48%", paddingVertical: 16 }}>
      <Text style={{ fontFamily: "Digital", fontSize: 28, color: color.ink }}>
        {value}
      </Text>
      <Text style={[ui.label, { marginTop: 8, marginBottom: 0 }]}>{label}</Text>
    </View>
  );
}
