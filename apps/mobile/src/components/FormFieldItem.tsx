import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FormField } from "@eazque/shared";
import { colors } from "../theme";

interface FormFieldItemProps {
  field: FormField;
  index: number;
  totalCount: number;
  onEdit: (fieldId: string) => void;
  onDelete: (fieldId: string) => void;
  onMoveUp: (fieldId: string) => void;
  onMoveDown: (fieldId: string) => void;
}

export default function FormFieldItem({
  field,
  index,
  totalCount,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: FormFieldItemProps) {
  const isFirst = index === 0;
  const isLast = index === totalCount - 1;

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.label}>{field.label}</Text>
        <View style={styles.meta}>
          <Text style={styles.type}>{field.type}</Text>
          {field.required && <Text style={styles.required}>Required</Text>}
        </View>
      </View>
      <View style={styles.controls}>
        <Pressable
          onPress={() => !isFirst && onMoveUp(field.id)}
          accessibilityLabel="Move up"
          style={[styles.iconButton, isFirst && styles.iconDisabled]}
        >
          <Ionicons
            name="chevron-up"
            size={18}
            color={isFirst ? colors.lightAccent : colors.textDark}
          />
        </Pressable>
        <Pressable
          onPress={() => !isLast && onMoveDown(field.id)}
          accessibilityLabel="Move down"
          style={[styles.iconButton, isLast && styles.iconDisabled]}
        >
          <Ionicons
            name="chevron-down"
            size={18}
            color={isLast ? colors.lightAccent : colors.textDark}
          />
        </Pressable>
        <Pressable
          onPress={() => onEdit(field.id)}
          accessibilityLabel="Edit field"
          style={styles.iconButton}
        >
          <Ionicons name="pencil" size={18} color={colors.note} />
        </Pressable>
        <Pressable
          onPress={() => onDelete(field.id)}
          accessibilityLabel="Delete field"
          style={styles.iconButton}
        >
          <Ionicons name="trash-outline" size={18} color={colors.remove} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textDark,
  },
  meta: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  type: {
    fontSize: 12,
    color: colors.secondary,
  },
  required: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
  },
  controls: {
    flexDirection: "row",
    gap: 4,
  },
  iconButton: {
    padding: 6,
  },
  iconDisabled: {
    opacity: 0.3,
  },
});
