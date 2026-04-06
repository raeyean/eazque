import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { useBusinessData } from "../hooks/useBusinessData";
import { useActiveQueue } from "../hooks/useActiveQueue";
import DynamicForm from "../components/DynamicForm";
import type { JoinQueueResponse } from "@eazque/shared";

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
      navigate(`/q/${businessId}/status/${result.data.sessionToken}`, {
        state: {
          ...result.data,
          businessName: business.name,
          whatsappNumber: business.whatsappNumber,
          primaryColor: business.primaryColor,
        },
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to join queue";
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
      {business.logo && (
        <img src={business.logo} alt={business.name} className="business-logo" />
      )}
      <h1>{business.name}</h1>
      <p className="queue-info">
        Now serving: Q-{String(queue.currentNumber).padStart(3, "0")} ·{" "}
        {queue.nextNumber - queue.currentNumber - 1} waiting
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
