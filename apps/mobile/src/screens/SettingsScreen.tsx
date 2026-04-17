import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
} from "react-native";
import DraggableFlatList, {
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../contexts/AuthContext";
import { useBusinessSettings } from "../hooks/useBusinessSettings";
import { updateBusinessSettings } from "../services/settingsActions";
import FormFieldItem from "../components/FormFieldItem";
import FormFieldEditorModal from "../components/FormFieldEditorModal";
import BusinessAvatar from "../components/BusinessAvatar";
import { uploadBusinessLogo } from "../services/logoActions";
import type { FormField } from "@eazque/shared";
import { colors, common } from "../theme";

export default function SettingsScreen({ navigation }: any) {
  const { businessId } = useAuth();
  const { business, loading } = useBusinessSettings(businessId!);

  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappApiKey, setWhatsappApiKey] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [threshold, setThreshold] = useState("");
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [logoUri, setLogoUri] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);

  useEffect(() => {
    if (business) {
      setName(business.name);
      setPrimaryColor(business.primaryColor);
      setWhatsappNumber(business.whatsappNumber);
      setWhatsappApiKey(business.whatsappApiKey);
      setEstimatedTime(String(business.defaultEstimatedTimePerCustomer));
      setThreshold(String(business.approachingThreshold));
      setFormFields(business.formFields ?? []);
      setLogoUri(business.logo ?? "");
      setDirty(false);
    }
  }, [business]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e: any) => {
      if (!dirty) return;
      e.preventDefault();
      Alert.alert(
        "Discard changes?",
        "You have unsaved changes. Discard them?",
        [
          { text: "Keep editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, dirty]);

  const markDirty = useCallback(
    <T,>(setter: (v: T) => void) =>
      (value: T) => {
        setter(value);
        setDirty(true);
      },
    []
  );

  const handleLogoPress = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;

    const previousUri = logoUri;
    const localUri = result.assets[0].uri;
    setLogoUri(localUri);
    setUploading(true);

    try {
      const url = await uploadBusinessLogo(businessId!, localUri);
      setLogoUri(url);
    } catch {
      Alert.alert("Error", "Failed to upload logo. Please try again.");
      setLogoUri(previousUri);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const parsedTime = Number(estimatedTime);
    const parsedThreshold = Number(threshold);

    if (!name.trim()) {
      Alert.alert("Error", "Business name is required.");
      return;
    }
    if (isNaN(parsedTime) || parsedTime <= 0) {
      Alert.alert("Error", "Estimated time must be a positive number.");
      return;
    }
    if (isNaN(parsedThreshold) || parsedThreshold < 1 || !Number.isInteger(parsedThreshold)) {
      Alert.alert("Error", "Approaching threshold must be a positive whole number.");
      return;
    }

    setSaving(true);
    try {
      await updateBusinessSettings(businessId!, {
        name: name.trim(),
        primaryColor: primaryColor.trim(),
        whatsappNumber: whatsappNumber.trim(),
        whatsappApiKey: whatsappApiKey.trim(),
        defaultEstimatedTimePerCustomer: parsedTime,
        approachingThreshold: parsedThreshold,
        formFields,
      });
      setDirty(false);
      Alert.alert("Saved", "Settings updated successfully.");
    } catch {
      Alert.alert("Error", "Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleFieldEdit = (fieldId: string) => {
    const field = formFields.find((f) => f.id === fieldId);
    if (field) {
      setEditingField(field);
      setShowFieldEditor(true);
    }
  };

  const handleFieldDelete = (fieldId: string) => {
    Alert.alert("Delete Field", "Remove this form field?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setFormFields((prev) => prev.filter((f) => f.id !== fieldId));
          setDirty(true);
        },
      },
    ]);
  };

  const handleFieldMoveUp = (fieldId: string) => {
    setFormFields((prev) => {
      const idx = prev.findIndex((f) => f.id === fieldId);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
    setDirty(true);
  };

  const handleFieldMoveDown = (fieldId: string) => {
    setFormFields((prev) => {
      const idx = prev.findIndex((f) => f.id === fieldId);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
    setDirty(true);
  };

  const handleFieldSave = (field: FormField) => {
    setFormFields((prev) => {
      const idx = prev.findIndex((f) => f.id === field.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = field;
        return next;
      }
      return [...prev, field];
    });
    setDirty(true);
    setShowFieldEditor(false);
    setEditingField(null);
  };

  const handleDragEnd = ({ data }: { data: FormField[] }) => {
    setFormFields(data);
    setDirty(true);
  };

  if (loading || !business) {
    return (
      <View style={[common.screen, styles.center]}>
        <Text style={common.subtitle}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={common.screen}>
      <ScrollView style={common.container}>
        {/* Business Profile */}
        <Text style={styles.sectionTitle}>Business Profile</Text>

        <View style={styles.avatarRow}>
          <BusinessAvatar
            uri={logoUri || undefined}
            name={name || business.name}
            size={72}
            onPress={handleLogoPress}
            uploading={uploading}
          />
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        <Text style={styles.label}>Business Name</Text>
        <TextInput
          style={common.input}
          value={name}
          onChangeText={markDirty(setName)}
          placeholder="Business name"
          placeholderTextColor={colors.secondary}
        />

        <Text style={styles.label}>Primary Color</Text>
        <TextInput
          style={common.input}
          value={primaryColor}
          onChangeText={markDirty(setPrimaryColor)}
          placeholder="#B8926A"
          placeholderTextColor={colors.secondary}
          autoCapitalize="none"
        />

        <Text style={styles.label}>WhatsApp Number</Text>
        <TextInput
          style={common.input}
          value={whatsappNumber}
          onChangeText={markDirty(setWhatsappNumber)}
          placeholder="+60123456789"
          placeholderTextColor={colors.secondary}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>WhatsApp API Key</Text>
        <TextInput
          style={common.input}
          value={whatsappApiKey}
          onChangeText={markDirty(setWhatsappApiKey)}
          placeholder="API key"
          placeholderTextColor={colors.secondary}
          secureTextEntry
        />

        {/* Queue Defaults */}
        <Text style={styles.sectionTitle}>Queue Defaults</Text>

        <Text style={styles.label}>Estimated Time per Customer (min)</Text>
        <TextInput
          style={common.input}
          value={estimatedTime}
          onChangeText={markDirty(setEstimatedTime)}
          placeholder="10"
          placeholderTextColor={colors.secondary}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Approaching Threshold</Text>
        <TextInput
          style={common.input}
          value={threshold}
          onChangeText={markDirty(setThreshold)}
          placeholder="3"
          placeholderTextColor={colors.secondary}
          keyboardType="numeric"
        />

        {/* Form Fields */}
        <Text style={styles.sectionTitle}>Customer Form Fields</Text>

        {formFields.length > 0 ? (
          <View style={styles.fieldsList}>
            <DraggableFlatList
              data={formFields}
              keyExtractor={(item) => item.id}
              onDragEnd={handleDragEnd}
              scrollEnabled={false}
              renderItem={({ item, drag, getIndex }: RenderItemParams<FormField>) => (
                <Pressable onLongPress={drag}>
                  <FormFieldItem
                    field={item}
                    index={getIndex() ?? 0}
                    totalCount={formFields.length}
                    onEdit={handleFieldEdit}
                    onDelete={handleFieldDelete}
                    onMoveUp={handleFieldMoveUp}
                    onMoveDown={handleFieldMoveDown}
                  />
                </Pressable>
              )}
            />
          </View>
        ) : (
          <Text style={styles.emptyFields}>
            No custom fields. Customers will only enter name and phone.
          </Text>
        )}

        <Pressable
          style={styles.addFieldButton}
          onPress={() => {
            setEditingField(null);
            setShowFieldEditor(true);
          }}
        >
          <Text style={styles.addFieldText}>+ Add Field</Text>
        </Pressable>

        {/* QR Code */}
        <Pressable
          style={styles.navRow}
          onPress={() => navigation.navigate("QRCode")}
        >
          <Text style={styles.navRowLabel}>QR Code</Text>
          <Text style={styles.navRowChevron}>›</Text>
        </Pressable>

        {/* Save Button */}
        <Pressable
          style={[
            common.button,
            styles.saveButton,
            (saving || !dirty) && common.buttonDisabled,
          ]}
          onPress={handleSave}
          disabled={saving || !dirty}
        >
          <Text style={common.buttonText}>
            {saving ? "Saving..." : "Save Changes"}
          </Text>
        </Pressable>
      </ScrollView>

      <FormFieldEditorModal
        visible={showFieldEditor}
        field={editingField}
        onSave={handleFieldSave}
        onCancel={() => {
          setShowFieldEditor(false);
          setEditingField(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textDark,
    marginTop: 20,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textDark,
    marginBottom: 4,
  },
  fieldsList: {
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: "hidden",
  },
  emptyFields: {
    fontSize: 14,
    color: colors.secondary,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 16,
  },
  addFieldButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  addFieldText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 40,
  },
  avatarRow: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarHint: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 6,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  navRowLabel: {
    fontSize: 16,
    color: colors.textDark,
    fontWeight: "500",
  },
  navRowChevron: {
    fontSize: 20,
    color: colors.secondary,
  },
});
