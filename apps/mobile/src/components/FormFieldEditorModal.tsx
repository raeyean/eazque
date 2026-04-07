import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  Switch,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FIELD_TYPES, type FieldType } from "@eazque/shared";
import type { FormField } from "@eazque/shared";
import { colors, common } from "../theme";

interface FormFieldEditorModalProps {
  visible: boolean;
  field: FormField | null; // null = creating new
  onSave: (field: FormField) => void;
  onCancel: () => void;
}

export default function FormFieldEditorModal({
  visible,
  field,
  onSave,
  onCancel,
}: FormFieldEditorModalProps) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FieldType>("text");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");

  useEffect(() => {
    if (field) {
      setLabel(field.label);
      setType(field.type);
      setRequired(field.required);
      setOptions(field.options ?? []);
    } else {
      setLabel("");
      setType("text");
      setRequired(false);
      setOptions([]);
    }
    setNewOption("");
  }, [field, visible]);

  const handleSave = () => {
    if (!label.trim()) return;
    if (type === "dropdown" && options.length === 0) return;

    onSave({
      id: field?.id ?? Date.now().toString(),
      label: label.trim(),
      type,
      required,
      options: type === "dropdown" ? options : undefined,
    });
  };

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (trimmed && !options.includes(trimmed)) {
      setOptions([...options, trimmed]);
      setNewOption("");
    }
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <ScrollView>
            <Text style={styles.title}>
              {field ? "Edit Field" : "Add Field"}
            </Text>

            <Text style={styles.inputLabel}>Label</Text>
            <TextInput
              style={common.input}
              value={label}
              onChangeText={setLabel}
              placeholder="Field label"
              placeholderTextColor={colors.secondary}
              autoFocus
            />

            <Text style={styles.inputLabel}>Type</Text>
            <View style={styles.typeRow}>
              {FIELD_TYPES.map((t) => (
                <Pressable
                  key={t}
                  style={[
                    styles.typeChip,
                    type === t && styles.typeChipActive,
                  ]}
                  onPress={() => setType(t)}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      type === t && styles.typeChipTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.inputLabel}>Required</Text>
              <Switch
                value={required}
                onValueChange={setRequired}
                trackColor={{ true: colors.primary, false: colors.lightAccent }}
                thumbColor={colors.white}
              />
            </View>

            {type === "dropdown" && (
              <View style={styles.optionsSection}>
                <Text style={styles.inputLabel}>Options</Text>
                {options.map((opt, i) => (
                  <View key={i} style={styles.optionRow}>
                    <Text style={styles.optionText}>{opt}</Text>
                    <Pressable onPress={() => handleRemoveOption(i)}>
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={colors.remove}
                      />
                    </Pressable>
                  </View>
                ))}
                <View style={styles.addOptionRow}>
                  <TextInput
                    style={[common.input, styles.optionInput]}
                    value={newOption}
                    onChangeText={setNewOption}
                    placeholder="New option"
                    placeholderTextColor={colors.secondary}
                    onSubmitEditing={handleAddOption}
                  />
                  <Pressable
                    style={styles.addOptionButton}
                    onPress={handleAddOption}
                  >
                    <Ionicons name="add" size={24} color={colors.primary} />
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.buttons}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={common.button} onPress={handleSave}>
              <Text style={common.buttonText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24,
  },
  content: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textDark,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textDark,
    marginBottom: 6,
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
  },
  typeChipText: {
    fontSize: 13,
    color: colors.textDark,
  },
  typeChipTextActive: {
    color: colors.white,
    fontWeight: "600",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  optionsSection: {
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: 6,
  },
  optionText: {
    fontSize: 14,
    color: colors.textDark,
  },
  addOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionInput: {
    flex: 1,
    marginBottom: 0,
  },
  addOptionButton: {
    padding: 8,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  cancelText: {
    color: colors.secondary,
    fontSize: 16,
  },
});
