import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { formatDisplayNumber } from "@eazque/shared";
import { useBusinessData } from "../hooks/useBusinessData";
import { useActiveQueue } from "../hooks/useActiveQueue";
import DynamicForm from "../components/DynamicForm";
import type { JoinQueueResponse } from "@eazque/shared";

const INITIALS_COLORS = [
  "#B8926A", "#8B6F47", "#A0845C", "#C4A882", "#6B5240", "#D4956A",
];

function getWebInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0][0]?.toUpperCase() ?? "?";
  return (words[0][0]?.toUpperCase() ?? "") + (words[1][0]?.toUpperCase() ?? "");
}

function getWebInitialsColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return INITIALS_COLORS[Math.abs(hash) % INITIALS_COLORS.length];
}

export default function JoinQueuePage() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { business, loading: bizLoading, error: bizError } = useBusinessData(
    businessId!
  );
  const { queueId, queue, loading: queueLoading } = useActiveQueue(
    businessId!
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (bizLoading || queueLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (bizError || !business) {
    return <div className="error">{bizError || "Business not found"}</div>;
  }

  if (!queue || !queueId) {
    return <div className="error">No active queue found</div>;
  }

  if (queue.status === "paused") {
    return (
      <div className="page-container">
        <h1>{business.name}</h1>
        <p className="queue-info">
          The queue is currently paused. Please check back later.
        </p>
      </div>
    );
  }

  const handleSubmit = async (data: {
    customerName: string;
    phone: string;
    formData: Record<string, string | number | boolean>;
  }) => {
    setSubmitting(true);
    setError(null);
    try {
      const joinQueue = httpsCallable<unknown, JoinQueueResponse>(
        functions,
        "onCustomerJoin"
      );
      const result = await joinQueue({
        businessId,
        queueId,
        ...data,
      });
      navigate(
        `/q/${businessId}/status/${result.data.entryId}/${result.data.sessionToken}`,
        {
          state: {
            ...result.data,
            businessName: business.name,
            whatsappNumber: business.whatsappNumber,
            primaryColor: business.primaryColor,
          },
        }
      );
    } catch (err: unknown) {
      const code = err && typeof err === "object" && "code" in err
        ? (err as { code: string }).code
        : "";
      let message = "Something went wrong. Please try again.";
      if (code === "functions/failed-precondition") message = "Queue is currently paused. Please try again later.";
      else if (code === "functions/not-found") message = "Queue not found. Please scan the QR code again.";
      else if (code === "functions/invalid-argument") message = "Please check your information and try again.";
      else if (code === "functions/resource-exhausted") message = "Queue is full. Please try again later.";
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <div
      className="page-container"
      style={
        { "--color-primary": business.primaryColor } as React.CSSProperties
      }
    >
      {business.logo ? (
        <img src={business.logo} alt={business.name} className="business-logo" />
      ) : (
        <div
          className="business-logo business-initials"
          style={{ backgroundColor: getWebInitialsColor(business.name) }}
        >
          {getWebInitials(business.name)}
        </div>
      )}
      <h1>{business.name}</h1>
      <p className="queue-info">
        Now serving: {formatDisplayNumber(queue.currentNumber)} ·{" "}
        {Math.max(0, queue.nextNumber - queue.currentNumber - 1)} waiting
      </p>
      {error && <div className="error-message">{error}</div>}
      <DynamicForm
        fields={business.formFields}
        primaryColor={business.primaryColor}
        loading={submitting}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
