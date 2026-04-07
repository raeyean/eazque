import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  Alert,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { useStaff } from "../hooks/useStaff";
import { addStaffMember, removeStaffMember } from "../services/staffActions";
import StaffList from "../components/StaffList";
import { colors, common } from "../theme";

export default function StaffScreen() {
  const { businessId, user } = useAuth();
  const { staff, loading } = useStaff(businessId!);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const handleRemove = (staffId: string) => {
    const member = staff.find((s) => s.id === staffId);
    Alert.alert(
      "Remove Staff",
      `Remove ${member?.name ?? "this staff member"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeStaffMember(businessId!, staffId),
        },
      ]
    );
  };

  const handleAdd = async () => {
    const email = newEmail.trim().toLowerCase();
    const name = newName.trim();

    if (!email || !name) {
      Alert.alert("Error", "Please enter both email and name.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    if (staff.some((s) => s.email === email)) {
      Alert.alert("Error", "A staff member with this email already exists.");
      return;
    }

    setAdding(true);
    try {
      await addStaffMember(businessId!, email, name);
      setShowAddModal(false);
      setNewEmail("");
      setNewName("");
    } catch {
      Alert.alert("Error", "Failed to add staff member. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <View style={[common.screen, styles.center]}>
        <Text style={common.subtitle}>Loading staff...</Text>
      </View>
    );
  }

  return (
    <View style={common.screen}>
      <View style={styles.header}>
        <Text style={common.title}>Team Members</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
          accessibilityLabel="Add staff"
        >
          <Ionicons name="person-add" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <StaffList
        staff={staff}
        currentUserId={user?.uid ?? ""}
        onRemove={handleRemove}
      />

      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Staff Member</Text>
            <TextInput
              style={common.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="Name"
              placeholderTextColor={colors.secondary}
              autoFocus
              accessibilityLabel="Staff name"
            />
            <TextInput
              style={common.input}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="Email"
              placeholderTextColor={colors.secondary}
              autoCapitalize="none"
              keyboardType="email-address"
              accessibilityLabel="Staff email"
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[common.button, adding && common.buttonDisabled]}
                onPress={handleAdd}
                disabled={adding}
              >
                <Text style={common.buttonText}>
                  {adding ? "Adding..." : "Add"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textDark,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
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
