import { useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useQueue } from "../hooks/useQueue";
import { useQueueEntries } from "../hooks/useQueueEntries";
import {
  advanceQueue,
  skipEntry,
  removeEntry,
  addNote,
  setQueueStatus,
} from "../services/queueActions";
import NowServing from "../components/NowServing";
import QueueStats from "../components/QueueStats";
import NextButton from "../components/NextButton";
import EntryList from "../components/EntryList";
import BusinessAvatar from "../components/BusinessAvatar";
import { useBusinessSettings } from "../hooks/useBusinessSettings";
import { colors, common } from "../theme";

export default function QueueScreen() {
  const { businessId } = useAuth();
  const { business } = useBusinessSettings(businessId!);
  const { queue, queueId, loading: queueLoading } = useQueue(businessId!);
  const { entries, loading: entriesLoading } = useQueueEntries(
    businessId!,
    queueId
  );
  const [advancing, setAdvancing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [noteEntryId, setNoteEntryId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const waitingEntries = entries.filter((e) => e.status === "waiting");
  const servingEntry = entries.find((e) => e.status === "serving");

  const handleNext = async () => {
    if (!queueId || waitingEntries.length === 0) return;
    setAdvancing(true);
    try {
      await advanceQueue(
        businessId!,
        queueId,
        waitingEntries,
        servingEntry?.id ?? null
      );
    } catch {
      Alert.alert("Error", "Failed to advance queue. Please try again.");
    } finally {
      setAdvancing(false);
    }
  };

  const handleTogglePause = async () => {
    if (!queueId || !queue) return;
    const next = queue.status === "active" ? "paused" : "active";
    setToggling(true);
    try {
      await setQueueStatus(businessId!, queueId, next);
    } catch {
      Alert.alert("Error", "Failed to update queue status.");
    } finally {
      setToggling(false);
    }
  };

  const handleSkip = (entryId: string) => {
    Alert.alert("Skip Customer", "Move this customer to skipped?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Skip",
        style: "destructive",
        onPress: () => skipEntry(businessId!, queueId!, entryId),
      },
    ]);
  };

  const handleRemove = (entryId: string) => {
    Alert.alert("Remove Customer", "Remove this customer from the queue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeEntry(businessId!, queueId!, entryId),
      },
    ]);
  };

  const handleSaveNote = async () => {
    if (!noteEntryId || !queueId) return;
    await addNote(businessId!, queueId, noteEntryId, noteText.trim());
    setNoteEntryId(null);
    setNoteText("");
  };

  if (queueLoading || entriesLoading) {
    return (
      <View style={[common.screen, styles.center]}>
        <Text style={common.subtitle}>Loading queue...</Text>
      </View>
    );
  }

  if (!queue || !queueId) {
    return (
      <View style={[common.screen, styles.center]}>
        <Text style={common.subtitle}>No queue found</Text>
      </View>
    );
  }

  return (
    <View style={common.screen}>
      <View style={common.container}>
        {business && (
          <View style={styles.avatarHeader}>
            <BusinessAvatar
              uri={business.logo || undefined}
              name={business.name}
              size={32}
            />
            <Text style={styles.businessName}>{business.name}</Text>
          </View>
        )}
        <NowServing currentNumber={queue.currentNumber} />
        <QueueStats
          waitingCount={waitingEntries.length}
          avgServiceTime={queue.avgServiceTime}
        />
        <NextButton
          onPress={handleNext}
          disabled={waitingEntries.length === 0 || queue.status === "paused"}
          loading={advancing}
        />
        <Pressable
          onPress={handleTogglePause}
          disabled={toggling}
          style={[
            styles.pauseButton,
            queue.status === "paused" ? styles.resumeButton : styles.pauseButtonActive,
          ]}
        >
          <Text style={[styles.pauseButtonText, queue.status === "paused" ? styles.resumeText : styles.pauseText]}>
            {toggling ? "..." : queue.status === "paused" ? "▶  Resume Queue" : "⏸  Pause Queue"}
          </Text>
        </Pressable>
        {queue.status === "paused" && (
          <View style={styles.pausedBanner}>
            <Text style={styles.pausedBannerText}>Queue paused — customers cannot join</Text>
          </View>
        )}
        <EntryList
          entries={waitingEntries}
          formFields={business?.formFields}
          onSkip={handleSkip}
          onRemove={handleRemove}
          onAddNote={(id) => {
            const entry = entries.find((e) => e.id === id);
            setNoteText(entry?.notes ?? "");
            setNoteEntryId(id);
          }}
        />
      </View>

      <Modal
        visible={noteEntryId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setNoteEntryId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Note</Text>
            <TextInput
              style={[common.input, styles.noteInput]}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Enter note..."
              placeholderTextColor={colors.secondary}
              multiline
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setNoteEntryId(null)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={common.button} onPress={handleSaveNote}>
                <Text style={common.buttonText}>Save</Text>
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
  avatarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  businessName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textDark,
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
  noteInput: {
    height: 100,
    textAlignVertical: "top",
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
  pauseButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  pauseButtonActive: {
    borderColor: "#f0a500",
  },
  resumeButton: {
    borderColor: "#4caf50",
  },
  pauseButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  pauseText: {
    color: "#f0a500",
  },
  resumeText: {
    color: "#4caf50",
  },
  pausedBanner: {
    backgroundColor: "#fff8e1",
    borderWidth: 1,
    borderColor: "#f0a500",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  pausedBannerText: {
    color: "#7a5800",
    fontSize: 13,
  },
});
